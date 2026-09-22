// Dark mode button.

var darkBtn = document.querySelector('#darkbutton');
if (darkBtn) darkBtn.onclick = function() {
  useDark = !useDark;
  toggleDarkMode(useDark);
  localStorage.setItem('dark-mode', useDark);
};
