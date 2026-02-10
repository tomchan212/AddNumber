/**
 * Contact collector – logic
 * No data is stored (no localStorage, no server). Names and numbers exist
 * only in memory for the current session and are gone when the tab is closed.
 * Extend or replace export logic here (e.g. WebView bridge).
 */

(function () {
  'use strict';

  const prefixInput = document.getElementById('prefix');
  const nameInput = document.getElementById('name');
  const numberInput = document.getElementById('number');
  const addRowBtn = document.getElementById('add-row');
  const exportBtn = document.getElementById('export-add');
  const listEl = document.getElementById('contact-list');

  /** In-memory only; never persisted for confidentiality. */
  let contacts = [];

  /** Stored format: prefix+name and number, e.g. "HHBUPeter 22233322". */
  function renderList() {
    listEl.innerHTML = '';
    contacts.forEach(function (c) {
      const li = document.createElement('li');
      li.innerHTML =
        '[<span class="prefix">' + escapeHtml(c.prefix) + '</span>] + ' +
        '[<span class="name">' + escapeHtml(c.name) + '</span>] + ' +
        '[<span class="number">' + escapeHtml(c.number) + '</span>]';
      listEl.appendChild(li);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /** vCard FN = prefix+name (e.g. HHBUPeter), TEL = number. */
  function buildVCard(contacts) {
    return contacts
      .map(function (c) {
        const prefix = (c.prefix || '').trim();
        const name = (c.name || '').trim();
        const number = (c.number || '').trim();
        const fullName = prefix + name; // stored as e.g. HHBUPeter
        const fn = fullName || number || 'Unknown';
        const n = fullName ? ';' + fullName + ';;' : ';;;';
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

  prefixInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameInput.focus();
    }
  });

  nameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      numberInput.focus();
    }
  });

  numberInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRowBtn.click();
    }
  });

  addRowBtn.addEventListener('click', function () {
    var prefix = (prefixInput.value || '').trim();
    var name = (nameInput.value || '').trim();
    var number = (numberInput.value || '').trim();
    if (!prefix && !name && !number) return;
    contacts.push({ prefix: prefix, name: name, number: number });
    renderList();
    prefixInput.value = '';
    nameInput.value = '';
    numberInput.value = '';
    prefixInput.focus();
  });

  exportBtn.addEventListener('click', function () {
    exportContacts(contacts, function (exported) {
      if (exported && contacts.length > 0) {
        contacts = [];
        renderList();
      }
    });
  });

  renderList();
})();
