// Dark mode button.

var darkBtn = document.querySelector('#darkbutton');
if (darkBtn) {
  // Expose the current theme state to assistive tech (useDark is set by the
  // inline head script before this deferred script runs).
  darkBtn.setAttribute('aria-pressed', String(useDark));
  darkBtn.onclick = function() {
    useDark = !useDark;
    toggleDarkMode(useDark);
    localStorage.setItem('dark-mode', useDark);
    darkBtn.setAttribute('aria-pressed', String(useDark));
  };
}
