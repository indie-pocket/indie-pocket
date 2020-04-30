function export_calib(coeff_red, muZ, X)
%EXPORT_CALIB Export the calibration data to a text file.

fid = fopen('calib.txt', 'w');

%
fprintf(fid, 'sizes\n%i %i %i\n', ...
        size(coeff_red, 1), size(coeff_red, 2), size(X, 1));

%
fprintf(fid, 'coeff_red\n');

for i = 1:size(coeff_red, 1)
    line = sprintf('%f ', coeff_red(i,:));
    line(end) = newline;
    fprintf(fid, line);
end

%
fprintf(fid, 'muZ\n');

line = sprintf('%f ', muZ);
line(end) = newline;
fprintf(fid, line);

%
fprintf(fid, 'X\n');

for i = 1:size(X, 1)
    line = [sprintf('%f ', table2array(X(i,1:end-1))) num2str(X.resp(i)) '\n'];
    fprintf(fid, line);
end

%
fclose(fid);

end

