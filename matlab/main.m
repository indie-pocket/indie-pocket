%% Main
% This is the main script for the processing workflow of measurement
% originating from the IndiePocket app. It is meant as a front-end user
% interface: run the appropriate section according to what you want to do.
% Process in the order of the section numbers, and use options A, B, C etc.
%
% Author: Tristan Vouga
% tristan.vouga@gmail.com
% Created: 2020-04-04
% Last edited: 2020-04-09

%% 1. Clear all_bin
all_bin = [];


%% 2. List files
dblist = dir('sensors-*.db');

IDs = [];

for i = 1:length(dblist)
    dbfile = fullfile([dblist(i).folder '\' dblist(i).name]);
    conn = sqlite(dbfile, 'readonly');
    try
        C_iid = fetch(conn, 'SELECT * FROM iid');
        
    catch
        disp('No ID data available')
        close(conn);
        continue
    end
    fprintf('File# %d %s has ID %d and ver %s on %s\n', i, dblist(i).name,...
            str2num(string(C_iid{1})), string(C_iid{2}),...
            string(C_iid{3}));

    IDs = [IDs str2num(string(C_iid{1}))];
    
    close(conn);
        
end

length(unique(IDs))

%% 3. Decide which sensors to use
% snsr_ref = {'acc', 'gyr'};%, 'lux', 'step', 'bar'};
snsr_ref = {'acc'};


%% 4.A Analyze all files at once

for i = 1:length(dblist)
    
    
    dbfile = fullfile([dblist(i).folder '\' dblist(i).name]);
    
    try
        bin = extract_bin_from_db(dbfile, 1, snsr_ref);
    catch
        fprintf('Dropped File# %d %s\n', i, dblist(i).name);
        continue
    end
    
    % Run FFT and reshape
    for b = 1:length(bin)
        for s = 1:length(bin(b).U)
            bin(b).fU{s}.dat = fft(bin(b).U{s}.dat);
            bin(b).V{s} = bin(b).fU{s}.dat(:);

        end
    end
    
    fprintf('File# %d : %d bins\n', i, length(bin));
        
%     printf('File %d has %d bins.\n', i, length(bin));
    
    % Collate bins

    if ~exist('all_bin', 'var')
        all_bin = []; end

    all_bin = [all_bin bin];
    
end


%% 4.B Analyze from file name

dbfile = fullfile('G:\My Drive\Indie-Pocket\Recordings\IndiePocketApp\sensors-1586164861706.db');

bin = extract_bin_from_db(dbfile, 1, snsr_ref);

%% 4.C Analyze from file number
i = 32;

dbfile = fullfile([dblist(i).folder '\' dblist(i).name]);

bin = extract_bin_from_db(dbfile, 1, snsr_ref);


%% 5. Run FFT and reshape data
for i = 1:length(bin)
    for s = 1:length(bin(i).U)
        bin(i).fU{s}.dat = fft(bin(i).U{s}.dat);
        bin(i).V{s} = bin(i).fU{s}.dat(:);

    end
end

%% 6.A Collate bins

if ~exist('all_bin', 'var')
    all_bin = []; end

all_bin = [all_bin bin];

%% 6.B combine files
tmp = all_bin;
load('2020-04-06 sandy.mat')
all_bin = [all_bin tmp];

%% Clean NANs


%% 7. Run PCA
Z = [];
for i = 1:length(all_bin)
    for s = 1:length(all_bin(i).U)
        
        Z(:,i) = all_bin(i).V{1};
    end
end
Z = Z'; %Doing this in the loop makes it much slower...

% aZ = abs(Z);
% aZ = find(isnan(aZ));
[coeff,PCs,latent]= pca(abs(Z));


%% 8. Create model
all_binT = table(PCs(:,1), PCs(:,2), PCs(:,3));
resp = [all_bin.label];

% Construct dataset with different types of features for use by the
% "Classification learner" toolbox.
X = all_binT;
X.resp = resp';

X2 = all_binT;
X2.resp = mod(resp, 10)';

% X3 = array2table(abs(Z)');
% X3.resp = resp';

X4 = array2table(PCs);
X4.resp = resp';

X5 = array2table(PCs);
X5.resp = mod(resp, 10)';

Mdl = fitcknn(all_binT, [all_bin.label]);

% Optional: modifiy number of neighbors
% Mdl.NumNeighbors = 2;

% Evaluate performance using crossvalidation (default: 5-fold)
CVMdl = crossval(Mdl);
kloss = kfoldLoss(CVMdl)


%% 9. Plot PCA
if ~exist('colors', 'var')
    run('generate_random_colors.m');
end

% First two PCs
figure(300); clf; hold on
for i = 1:length(all_bin)
    scatter(PCs(i,1),PCs(i,2), 'MarkerFaceColor', colors{all_bin(i).label},...
                               'MarkerEdgeColor', colors{mod(all_bin(i).IID, 120)},...
                               'LineWidth', 0.05);
    
end
xlabel('PC1')
ylabel('PC2')

% 3D scatter of first 3 PCs
figure(301); clf; hold on
for i = 1:length(all_bin)
    scatter3(PCs(i,1),PCs(i,2),PCs(i,3), 'MarkerFaceColor', colors{all_bin(i).label},...
                                        'MarkerEdgeColor', colors{all_bin(i).label},...
                                        'LineWidth', 0.05);
                                    
%                                         'MarkerEdgeColor', colors{mod(all_bin(i).IID, 120)},...
    
end
xlabel('PC1')
ylabel('PC2')
zlabel('PC3')

% 3D scatter of first 3 PCs, display only different pocket locations
figure(302); clf; hold on
for i = 1:length(all_bin)
    scatter3(PCs(i,1),PCs(i,2),PCs(i,3), 'MarkerFaceColor', colors{mod(all_bin(i).label, 10)},...
                                        'MarkerEdgeColor', colors{mod(all_bin(i).label, 10)},...
                                        'LineWidth', 0.05);
    
%                                         'MarkerEdgeColor', colors{mod(all_bin(i).IID, 120)},...
end
xlabel('PC1')
ylabel('PC2')
zlabel('PC3')

% Legend of colors
location_str = {'On table' 'In Hand' 'Ag. Head' 'Front Pkt.'...
                'Back Pkt.' 'Frt. Jack. Pkt.' 'Handbag' 'Backpack'};
            
u_lab = unique(mod([all_bin.label], 10));
figure(303); clf; hold on

for i = 1:length(u_lab)
    scatter(0, -i, 'MarkerFaceColor', colors{mod(u_lab(i), 10)},...
                   'MarkerEdgeColor', colors{mod(u_lab(i), 10)});
    text(1, -i, location_str(mod(u_lab(i), 10)));
end

xlim([-0.2 3])
ylim([-9 0])
axis off


%% 10. Show bins stats
activity_str = {'Any' 'Walking' 'Standing' 'Sitting'...
                'Upstairs' 'Downstairs' 'Transports' 'Running',...
                'Biking'};

% figure(600)
% hist_bins = 1:98;
% hist(double([all_bin.label]), hist_bins)

figure(601)
hist_bins = 1:8;
hist(double(mod([all_bin.label], 10)), hist_bins)
set(gca,'xtick',[1:8],'xticklabel',location_str)
% set(gca,'XTickLabelRotation', 0)
set(gca,'view',[90 -90])

figure(602)
hist_bins = 0:8;
hist(double(floor([all_bin.label]/10)), hist_bins)
set(gca,'xtick',[0:8],'xticklabel',activity_str)
% set(gca,'XTickLabelRotation', 0)
set(gca,'view',[90 -90])
