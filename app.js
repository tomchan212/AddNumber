/**
 * Contact collector – logic
 * Extend or replace export logic here (e.g. WebView bridge).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'contactCollectorList';

  const nameInput = document.getElementById('name');
  const numberInput = document.getElementById('number');
  const confirmBtn = document.getElementById('confirm-name');
  const addRowBtn = document.getElementById('add-row');
  const exportBtn = document.getElementById('export-add');
  const listEl = document.getElementById('contact-list');

  let contacts = loadFromStorage();

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    } catch (_) {}
  }

  function renderList() {
    listEl.innerHTML = '';
    contacts.forEach(function (c) {
      const li = document.createElement('li');
      li.innerHTML =
        '<span class="name">' +
        escapeHtml(c.name) +
        '</span><span class="number">' +
        escapeHtml(c.number) +
        '</span>';
      listEl.appendChild(li);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function buildVCard(contacts) {
    return contacts
      .map(function (c) {
        const name = (c.name || '').trim();
        const number = (c.number || '').trim();
        const fn = name || number || 'Unknown';
        const n = name ? ';' + name + ';;' : ';;;';
        return (
          'BEGIN:VCARD\r\n' +
          'VERSION:3.0\r\n' +
          'N:' + n + '\r\n' +
          'FN:' + fn + '\r\n' +
          'TEL;TYPE=CELL:' + number + '\r\n' +
          'END:VCARD\r\n'
        );
      })
      .join('');
  }

  function downloadVcf(vcardContent, filename) {
    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'contacts.vcf';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export path used when user taps "Add".
   * Default: generate and download a .vcf file.
   * Hook for hybrid/WebView: call native code here after user confirmation,
   * then optionally call done() or prevent default download.
   */
  function exportContacts(list, done) {
    if (list.length === 0) {
      if (typeof done === 'function') done(false);
      return;
    }
    var vcard = buildVCard(list);
    var filename = 'contacts-' + new Date().toISOString().slice(0, 10) + '.vcf';
    downloadVcf(vcard, filename);
    if (typeof done === 'function') done(true);
  }

  function focusToNumber() {
    numberInput.focus();
  }

  confirmBtn.addEventListener('click', focusToNumber);

  nameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusToNumber();
    }
  });

  numberInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRowBtn.click();
    }
  });

  addRowBtn.addEventListener('click', function () {
    var name = (nameInput.value || '').trim();
    var number = (numberInput.value || '').trim();
    if (!name && !number) return;
    contacts.push({ name: name, number: number });
    saveToStorage();
    renderList();
    nameInput.value = '';
    numberInput.value = '';
    nameInput.focus();
  });

  exportBtn.addEventListener('click', function () {
    exportContacts(contacts, function (exported) {
      if (exported && contacts.length > 0) {
        contacts = [];
        saveToStorage();
        renderList();
      }
    });
  });

  renderList();
})();
