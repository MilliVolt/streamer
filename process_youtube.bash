video_url=$1
audio_url=$2
id=$3
video_file=buf/video_$3
audio_file=buf/audio_$3
audio_oga=$audio_file.oga

tmp_file=$video_file.tmp
tmp_file2=$tmp_file.simp
tmp_audio=$audio_file.tmp

echo $video_file
echo $tmp_file
echo $tmp_file2

#torsocks -i wget -O $video_file $video_url
wget -O $video_file $video_url
ffprobe -show_frames -of compact=p=0 -f lavfi "movie=$video_file,select=gt(scene\,.35)" > $tmp_file
cat $tmp_file |awk -F '|' '{print $5}' | awk -F '=' '{print $2}' > $tmp_file2
rm $video_file
rm $tmp_file

#torsocks -i wget -O $audio_file $audio_url
wget -O $audio_file $audio_url
ffmpeg -i $audio_file $audio_oga
aubiotrack $audio_oga > $tmp_audio
rm $audio_file
rm $audio_oga
