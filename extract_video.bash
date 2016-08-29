VIDEO=$1
tmp_file="$1.tmp"
tmp_file2="$1_simp.tmp"
ffprobe -show_frames -of compact=p=0 -f lavfi "movie=$VIDEO,select=gt(scene\,.4)" > $tmp_file
cat $tmp_file |awk -F '|' '{print $5}' | awk -F '=' '{print $2}' > $tmp_file2
rm $VIDEO
rm $tmp_file
