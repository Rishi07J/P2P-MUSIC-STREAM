const client = new WebTorrent();

function seedFile() {
  const fileInput = document.getElementById('fileInput');
  const files = fileInput.files;
  const userName = document.getElementById('userName').value.trim();
  const anonymous = document.getElementById('anonymousOption').checked;

  if (files.length === 0) {
    alert('Please select a file to share.');
    return;
  }

  if (!anonymous && userName === '') {
    alert('Please enter your name or choose to stay anonymous.');
    return;
  }

  const displayName = anonymous ? 'Anonymous' : encodeURIComponent(userName);

  client.seed(files, torrent => {
    let magnetURI = torrent.magnetURI;
    magnetURI += `&uploader=${displayName}`;
    document.getElementById('magnetLink').value = magnetURI;

    const fileName = files[0].name;
    document.getElementById('songDetails').innerHTML = `File Name: ${fileName}<br>Uploaded by: ${decodeURIComponent(displayName)}`;
  });
}

function startStreaming() {
  const magnetURI = document.getElementById('magnetInput').value;
  const audio = document.getElementById('audioPlayer');
  const songDetails = document.getElementById('songDetails');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const chunkList = document.getElementById('chunkList'); // <--

  if (!magnetURI) {
    alert('Please paste a magnet link.');
    return;
  }

  loadingSpinner.style.display = 'block';
  chunkList.innerHTML = ''; // Clear previous chunk stats

  let uploader = 'Unknown';
  const match = magnetURI.match(/&uploader=([^&]+)/);
  if (match && match[1]) {
    uploader = decodeURIComponent(match[1]);
  }

  client.add(magnetURI, torrent => {
    const file = torrent.files.find(file =>
      file.name.endsWith('.mp3') || file.name.endsWith('.wav')
    );

    if (!file) {
      loadingSpinner.style.display = 'none';
      alert('No audio file (.mp3 or .wav) found in torrent.');
      return;
    }

    // Chunk and peer tracker
    torrent.on('download', bytes => {
      const peers = torrent.wires
        .filter(wire => wire.peerId)
        .map(wire => wire.peerId.toString('hex').slice(0, 8));

      const chunkIndex = torrent.pieces.reduce((count, piece, idx) =>
        piece && piece.verified ? idx : count, 0
      );

      const li = document.createElement('li');
      li.textContent = `Chunk ${chunkIndex} downloaded from: ${peers.join(', ')}`;

      chunkList.insertBefore(li, chunkList.firstChild);
      if (chunkList.childNodes.length > 20) {
        chunkList.removeChild(chunkList.lastChild);
      }
    });

    file.getBlobURL((err, url) => {
      loadingSpinner.style.display = 'none';
      if (err) {
        console.error('Error getting blob URL:', err);
        return;
      }

      audio.src = url;
      audio.style.display = 'block';
      audio.play();

      songDetails.innerHTML = `Now Playing: ${file.name}<br>Uploaded by: ${uploader}`;
    });
  });
}
