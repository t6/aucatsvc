## chroot preparation

### Linux

1. `echo snd_mixer_oss >> /etc/modules`
2. `mkdir $chroot/dev`
3. `mknod $chroot/dev/mixer c 14 0`
4. `chown $runas $chroot/dev/mixer`
5. `cp ~/.aucat_cookie $chroot`
