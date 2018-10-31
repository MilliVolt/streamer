# this is the version that only concernes audio
# it uses superflux instead of aubio, slower, but with better results
id=$1
audio_file=buf/audio_$1
tmp_audio=$audio_file.tmp

youtube-dl -f "bestaudio" "http://www.youtube.com/watch?v=$id" -o "$audio_file"
aubioonset -O specflux $audio_file > $tmp_audio
rm $audio_file
