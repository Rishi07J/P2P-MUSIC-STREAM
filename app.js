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
  const chunkList = document.getElementById('chunkList');
  const peerStats = document.getElementById('peerStats'); // Element for peer stats

  if (!magnetURI) {
    alert('Please paste a magnet link.');
    return;
  }

  loadingSpinner.style.display = 'block';
  chunkList.innerHTML = '';
  peerStats.innerHTML = ''; // Clear previous peer stats

  let uploader = 'Unknown';
  const match = magnetURI.match(/&uploader=([^&]+)/);
  if (match && match[1]) {
    uploader = decodeURIComponent(match[1]);
  }

  client.add(magnetURI, torrent => {
    console.log('Torrent added:', torrent.infoHash);
    console.log('Number of pieces:', torrent.pieces.length);
    console.log('Peers:', torrent.numPeers);

    document.getElementById('totalPieces').textContent = `Total Pieces: ${torrent.pieces.length}`;

    const file = torrent.files.find(file =>
      file.name.endsWith('.mp3') || file.name.endsWith('.wav')
    );

    if (!file) {
      loadingSpinner.style.display = 'none';
      alert('No audio file (.mp3 or .wav) found in torrent.');
      return;
    }

    let totalPeers = 0; // Track number of peers

    // Track download progress and peer information
    torrent.on('download', bytes => {
      const peers = torrent.wires
        .filter(wire => wire.peerId)
        .map(wire => wire.peerId.toString('hex').slice(0, 8));

      // Calculate number of peers
      totalPeers = peers.length;

      const latestPieceIndex = Math.floor(torrent.downloaded / torrent.pieceLength);

      const li = document.createElement('li');
      li.textContent = `Chunk ${latestPieceIndex} downloaded from: ${peers.join(', ')}`;
      chunkList.insertBefore(li, chunkList.firstChild);

      if (chunkList.childNodes.length > 20) {
        chunkList.removeChild(chunkList.lastChild); // Keep list size manageable
      }

      // Show peer info (number of peers, IPs, and speeds)
      const peerInfo = torrent.wires.map((wire, index) => {
        const ip = wire.remoteAddress || "Unknown IP";
        const downloadSpeed = wire.downloadSpeed / 1024; // Convert bytes to KB
        const uploadSpeed = wire.uploadSpeed / 1024; // Convert bytes to KB
        return `<div>Peer ${index + 1} IP: ${ip} | Down: ${downloadSpeed.toFixed(2)} KB/s | Up: ${uploadSpeed.toFixed(2)} KB/s</div>`;
      }).join('');

      peerStats.innerHTML = `<p>Total Peers: ${totalPeers}</p>` + peerInfo;
    });

    // Stream audio directly
    file.renderTo(audio, { autoplay: true }, err => {
      loadingSpinner.style.display = 'none';

      if (err) {
        console.error('Streaming error:', err);
        return;
      }

      audio.style.display = 'block';
      songDetails.innerHTML = `Now Playing: ${file.name}<br>Uploaded by: ${uploader}`;
    });
  });
}

