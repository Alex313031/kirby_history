//Copy text button for <pre>
function copyText() {
  var copyToText = document.getElementById('copy-text').textContent;

  // Modern async Clipboard API (needs a secure context, i.e. https or localhost)
  navigator.clipboard.writeText(copyToText).then(function () {
    // Log the copied text
    console.log('Copied the text: ' + copyToText);
  }).catch(function (err) {
    console.error('Copy failed: ', err);
  });
}
