function bin = extract_bin_from_db(dbfile, Nbin_trim, snsr_ref)
% This function extracts all valid bins from an IndiePocket measurement
% session passed in argument as a SQLite database handle. It returns all
% valid bins as a structure array, including the sensor data, the label,
% the file it originated from and the IID information.
%
% Arguments:
% dbfile: the file to extract the bins from
% Nbin_trim: the number of bins to discard at each end of a recording phase
% snsr_ref: the list of sensors to extract from the database, as a cell
% array of character strings.
%
% Author: Tristan Vouga
% tristan.vouga@gmail.com
% Created: 2020-04-04
% Last edited: 2020-04-09


conn = sqlite(dbfile);
try
    C = fetch(conn, 'SELECT * FROM sensor_data');
catch
    close(conn);
    return
end

try
    C_iid = fetch(conn, 'SELECT * FROM iid');
catch
    disp('No valid ID found')
    close(conn);
    return
end

% Construct the main data table
T = cell2table(C,...
    'VariableNames',{'line' 'label_num' 'phase' 'sensor' 'void' 'data_s' 'timestamp'});

T.sensor = string(T.sensor);
T.data_s = string(T.data_s);

T = sortrows(T,'timestamp','ascend');
T = T(T.timestamp ~= 0, :);


% List all sensors and count their axes
snsr_list = unique(T.sensor);
for i = 1:length(snsr_list)
    sub_T = T(T.sensor == snsr_list(i),:);
    dT = median(diff(sub_T.timestamp));
    dT2 = min(diff(sub_T.timestamp));
    n_axes(i) = length(strfind(sub_T.data_s(1), ','))+1;
    
    % If desired, display sensor median and minimum sampling rate in ms
%     fprintf('Sensor: %s,\t\t dT: %1.f,\t\t Min dT: %1.f,...
%             \t\tSample data: %s\n', snsr_list(i), dT/1000000,...
%             dT2/1000000, sub_T.data_s(1));
    
end

% Parse data_s field for sensor readouts and store in individual cell array
snsr_T = {};
for i = 1:length(snsr_list)

    snsr_T{i} = extract_data_snsrlog(T, snsr_list(i), n_axes(i));
    
end


% Sort sensors according to order and requested sensors list in argument
for i = 1:length(snsr_ref)

    % TODO: Add sensor presence check here
    snsr_idx = find(~cellfun(@isempty, strfind(snsr_list, snsr_ref(i))));
    S{i} = snsr_T{snsr_idx};
    
end


%Plot entire session for visual verification
figure(100); clf; hold on

% Accelerometer data
s1 = subplot(511);
plot(S{1}.timestamp, S{1}.dat);
hold on

%Gyroscope data if available
if contains(snsr_list, 'gyr')
    plot(S{2}.timestamp, S{2}.dat);
end

ylabel('IMU')

% Other plots if desired

% s2 = subplot(612);
% stairs(S{3}.timestamp, S{3}.dat);
% ylabel('Lux')
% 
% s3 = subplot(613);
% plot(S{5}.timestamp, S{5}.dat);
% ylabel('Bar')
% 
% s4 = subplot(614);
% plot(S{4}.timestamp, S{4}.dat);
% ylabel('Steps')

% Phase number
s2 = subplot(512);
plot(S{1}.timestamp, S{1}.phase);
ylabel('Phase')

% Data label (activities and pocket location
s3 = subplot(513);
plot(S{1}.timestamp, S{1}.label_num);
ylabel('Label')


% Time difference between samples (dT)
% figure(101);
s5 = subplot(515);
plot(T(T.sensor == snsr_list(1),:).timestamp(1:end-1),...
     diff(T(T.sensor == snsr_list(1),:).timestamp));

linkaxes([s1 s2 s3 s5], 'x');

%% Split into bins
% Sampling frequencies and constants
% Using constants so far, should be updated

% Number of time stamps included in a bin
STAMPS_PER_BIN = 5000000000; %5 seconds @ 1Ghz
% Sampling rate of different sensors in the interpolated timebase
IMU_DT = 2000000;
LUX_DT = 180000000;
BAR_DT = 100000000;
STP_DT = 20000000;
all_dT = [IMU_DT IMU_DT LUX_DT STP_DT BAR_DT];

%Bin time margin (or "handles") used for interpolation
all_margin = 10*all_dT;

% List the phases of the session
phase_list = unique(T.phase);

%Remove duplicate measures in S, store in V
for i = 1:length(S)
    [~,al,~] = unique(double(S{i}.timestamp),'stable');
    V{i} = S{i}(al,:);
end

bin = [];
n_skipped_bins = 0; % Invalid bins counter
n_nominal_bins = 0;

for ph = phase_list'
    
%     disp(ph)
    
    phase_T = T(T.phase == ph,:);
    
    %Trust accelerometer data to look for available measurements
    acc_T = phase_T(phase_T.sensor == snsr_list(1),:);
    
    if isempty(acc_T)
        continue; end
    
    %Determine start and end timestamps
    phase_start_time = min(acc_T.timestamp);
    phase_end_time = max(acc_T.timestamp);
    
    %Calculate number of bins to extract
    N_bins = floor(double((phase_end_time - phase_start_time))/STAMPS_PER_BIN);
    if N_bins <1
        continue; end
    n_nominal_bins = n_nominal_bins + N_bins;
    
    tmp_bin = [];
    
    % Flag for invalid bins
    skip_bin = 0;
    
    
    for i_bin = (1+Nbin_trim):(N_bins-Nbin_trim) %Remove N first and last
        
        % Store basic information in temp bin
        tmp_bin.label = phase_T.label_num(1);
        tmp_bin.IID = str2num(string(C_iid{1}));
        tmp_bin.filename = dbfile;
        
        % Start and end time stamps
        bin_start_time = phase_start_time + (STAMPS_PER_BIN) * (i_bin-1);
        bin_end_time = bin_start_time + STAMPS_PER_BIN;
        
        
        % Interpolate all sensors on consistent time base
        for s = 1:length(snsr_ref)
            
            % Trim sensor data to bin duration +/- a margin
            bin_V = V{s}((V{s}.timestamp > (bin_start_time - all_margin(s))) &...
                         (V{s}.timestamp < (bin_end_time   + all_margin(s))), :);
            
            % The new timebase vector
            XQ = bin_start_time:all_dT(s):(bin_start_time+STAMPS_PER_BIN);
            
            % Try to interpolate
            try
                bin_S_int = interp1(double(bin_V.timestamp), bin_V.dat, double(XQ));
            catch
                % Maybe data is inexistant -> drop bin (should be replaced
                % by sanity checks before instead of this try/catch)
%                 fprintf('Dropped bin %d\n', i_bin);
                skip_bin = 1;
                continue
            end
            
            % If there are NANs in the interpolated data -> drop bin.
            % Usually due to incomplete sensor data
            if sum(sum(isnan(bin_S_int)))
%                 fprintf('Dropped bin, has NANs %d\n', i_bin);
                skip_bin = 1;
                continue
            end
            
            % If the bin made it here, it can be stored in the temp bin.
            tmp_bin.U{s}.dat = bin_S_int;
            tmp_bin.U{s}.timestamp = XQ;
            
        end
        if skip_bin == 1
            skip_bin = 0;
            n_skipped_bins = n_skipped_bins + 1;
        else
            % If bin not dropped, it can be accumulated with all other bins
            bin = [bin tmp_bin];
        end
        
%         disp(i_bin)
    end
end

fprintf('Bins stats: Nominal: %d; Collected: %d; Dropped : %d\n',...
        n_nominal_bins, length(bin), n_skipped_bins);

%% Plot bins for visual inspection
figure(100);
s4 = subplot(514); hold on

% Construct data for display
imu = [];
timestamp = [];
bounds = [];
for i = 1:length(bin)
    plot(bin(i).U{1}.timestamp, bin(i).U{1}.dat);
    imu = [imu; bin(i).U{1}.dat];
    timestamp = [timestamp bin(i).U{1}.timestamp];
    bounds(i,1) = bin(i).U{1}.timestamp(1);
    bounds(i,2) = bin(i).U{1}.timestamp(end);
end

plot(bounds', zeros(size(bounds))', 'linewidth', 7);

linkaxes([s1 s2 s3 s4], 'x');

%% Plot labels histograms (Consider using hist3 for 3D histogram))
if(~isempty(bin))

    % Label texts
    location_str = {'On table' 'In Hand' 'Ag. Head' 'Front Pkt.'...
                    'Back Pkt.' 'Frt. Jack. Pkt.' 'Handbag' 'Backpack'};
    activity_str = {'Any' 'Walking' 'Standing' 'Sitting'...
                    'Upstairs' 'Downstairs' 'Transports' 'Running',...
                    'Biking'};


    figure(601)
    hist_bins = 1:8;
    hist(double(mod([bin.label], 10)), hist_bins)
    set(gca,'xtick',[1:8],'xticklabel',location_str)
    % set(gca,'XTickLabelRotation', 0)
    set(gca,'view',[90 -90])

    figure(602)
    hist_bins = 0:8;
    hist(floor(double([bin.label])/10), hist_bins)
    set(gca,'xtick',[0:8],'xticklabel',activity_str)
    % set(gca,'XTickLabelRotation', 0)
    set(gca,'view',[90 -90])
end
