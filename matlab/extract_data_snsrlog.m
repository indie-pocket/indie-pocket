function dat_T = extract_data_snsrlog(T, sensor_name, n_axes)
% Parse the data of a given sensor, keeping original information intact
% (including timestamps and string formated data)
%
% Author: Tristan Vouga
% tristan.vouga@gmail.com
% Created: 2020-04-04
% Last edited: 2020-04-09

% Select rows that correspond to the selected sensor
dat_T = T(T.sensor == sensor_name,:);
dat_T.dat = zeros(height(dat_T), 3); % TODO: remove?

% Extract initial data
data_s = dat_T.data_s;
N = height(dat_T);

% Memory allocation
dat = zeros(n_axes,N);

% Create format depending on sensor type
format_str = ['[' repmat('%f, ', 1, n_axes-1) '%f]'];

% Initialize waitbar
w=waitbar(0);

for i = 1:N
    dat(:,i) = sscanf(data_s(i), format_str);
    
    % Update the waitbar now and then
    if mod(i,10000)==0
        % disp(num2str(i))
        w=waitbar(i/N);
    end
end
close(w)

% Copy data into return structure.
dat_T.dat = dat';