let searchTimeout = null;

// Debounces searches as user types
function handleGlobalSearchInput() {
  const queryVal = document.getElementById('global-search-input').value.trim();
  const dropdown = document.getElementById('global-search-dropdown');

  if (searchTimeout) clearTimeout(searchTimeout);

  if (queryVal.length === 0) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const res = await API.get(`/api/search?q=${encodeURIComponent(queryVal)}`);
      if (res.success && res.results) {
        renderGlobalSearchResults(res.results);
      }
    } catch (e) {
      console.error('Global search error:', e);
    }
  }, 250);
}

function renderGlobalSearchResults(results) {
  const dropdown = document.getElementById('global-search-dropdown');
  dropdown.innerHTML = '';
  dropdown.classList.remove('hidden');

  let hasData = false;

  const sections = [
    { key: 'books', label: 'Library Books', panel: 'library', icon: '📚' },
    { key: 'exams', label: 'Competitive Exams', panel: 'comp_exams', icon: '📝' },
    { key: 'notes', label: 'Study Guides', panel: 'notes', icon: '📁' },
    { key: 'doubts', label: 'Solved Doubts', panel: 'forum', icon: '❓' },
    { key: 'students', label: 'Students List', panel: 'users', icon: '👤' }
  ];

  sections.forEach(s => {
    const list = results[s.key] || [];
    if (list.length > 0) {
      hasData = true;
      
      const header = document.createElement('div');
      header.style.fontSize = '0.75rem';
      header.style.fontWeight = '700';
      header.style.color = 'var(--text-light)';
      header.style.textTransform = 'uppercase';
      header.style.borderBottom = '1px solid var(--border-color)';
      header.style.paddingBottom = '4px';
      header.style.marginTop = '6px';
      header.textContent = s.label;
      dropdown.appendChild(header);

      list.forEach(item => {
        const div = document.createElement('div');
        div.style.padding = '8px';
        div.style.borderRadius = 'var(--radius-sm)';
        div.style.cursor = 'pointer';
        div.style.fontSize = '0.85rem';
        div.style.transition = 'background 0.2s';
        
        let text = item.title || item.name || item.full_name || '';
        let subtitle = item.author || item.conducting_authority || item.category || '';
        
        div.innerHTML = `
          <div style="font-weight:600;">${s.icon} ${escapeHtml(text)}</div>
          ${subtitle ? `<div style="font-size:0.75rem; color:var(--text-light); margin-top:2px;">${escapeHtml(subtitle)}</div>` : ''}
        `;

        div.onmouseover = () => div.style.background = 'rgba(255,255,255,0.05)';
        div.onmouseout = () => div.style.background = 'transparent';
        
        div.onclick = () => {
          dropdown.classList.add('hidden');
          document.getElementById('global-search-input').value = '';
          selectMenuPanel(s.panel);
        };

        dropdown.appendChild(div);
      });
    }
  });

  if (!hasData) {
    dropdown.innerHTML = '<div style="color:var(--text-light); text-align:center; padding:12px; font-size:0.85rem;">No matching entries found</div>';
  }
}

// Close search dropdown on click outside
document.addEventListener('click', (e) => {
  const input = document.getElementById('global-search-input');
  const dropdown = document.getElementById('global-search-dropdown');
  if (dropdown && !dropdown.classList.contains('hidden') && !dropdown.contains(e.target) && e.target !== input) {
    dropdown.classList.add('hidden');
  }
});
