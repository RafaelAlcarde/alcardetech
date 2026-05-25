<script>
  fetch('https://raw.githubusercontent.com/RafaelAlcarde/alcardetech/refs/heads/main/scripts/sidebar_principal_alcardetech.js')
    .then(r => r.text())
    .then(code => {
      const s = document.createElement('script');
      s.textContent = code;
      document.head.appendChild(s);
    });
</script>