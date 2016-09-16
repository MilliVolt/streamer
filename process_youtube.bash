id=$1
video_file=buf/video_$1
audio_file=buf/audio_$1
audio_oga=$audio_file.oga

tmp_file=$video_file.tmp
tmp_file2=$tmp_file.simp
tmp_audio=$audio_file.tmp

#torsocks -i wget -O $video_file $video_url
youtube-dl -f "worstvideo" $id -o "$video_file"
ffprobe -show_frames -of compact=p=0 -f lavfi "movie=$video_file,select=gt(scene\,.35)" > $tmp_file
cat $tmp_file |awk -F '|' '{print $5}' | awk -F '=' '{print $2}' > $tmp_file2
rm $tmp_file

#torsocks -i wget -O $audio_file $audio_url
youtube-dl -f "bestaudio" $id -o "$audio_file"
ffmpeg -i $audio_file $audio_oga
aubiotrack $audio_oga > $tmp_audio
rm $audio_file
rm $audio_oga
