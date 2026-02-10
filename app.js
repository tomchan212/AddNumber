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
  const resetListBtn = document.getElementById('reset-list');
  const listEl = document.getElementById('contact-list');
  const editModal = document.getElementById('edit-modal');
  const editPrefix = document.getElementById('edit-prefix');
  const editName = document.getElementById('edit-name');
  const editNumber = document.getElementById('edit-number');
  const editSaveBtn = document.getElementById('edit-save');
  const editCancelBtn = document.getElementById('edit-cancel');
  const editDeleteBtn = document.getElementById('edit-delete');
  const modalOverlay = editModal && editModal.querySelector('.modal-overlay');

  /** In-memory only; never persisted for confidentiality. */
  let contacts = [];

  /** Index of contact being edited, or null when adding new. */
  let editingIndex = null;

  /** Stored format: prefix+name and number, e.g. "HHBUPeter 22233322". */
  function renderList() {
    listEl.innerHTML = '';
    contacts.forEach(function (c, index) {
      const li = document.createElement('li');
      li.className = 'contact-item';
      const text = document.createElement('span');
      text.className = 'contact-item-text';
      text.innerHTML =
        '[<span class="prefix">' + escapeHtml(c.prefix) + '</span>] + ' +
        '[<span class="name">' + escapeHtml(c.name) + '</span>] + ' +
        '[<span class="number">' + escapeHtml(c.number) + '</span>]';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-edit';
      editBtn.textContent = '編輯';
      editBtn.addEventListener('click', function () {
        editingIndex = index;
        editPrefix.value = c.prefix || '';
        editName.value = c.name || '';
        editNumber.value = c.number || '';
        editModal.classList.add('is-open');
        editModal.setAttribute('aria-hidden', 'false');
        editPrefix.focus();
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete-inline';
      deleteBtn.textContent = '刪除';
      deleteBtn.addEventListener('click', function () {
        contacts.splice(index, 1);
        renderList();
      });
      const btnGroup = document.createElement('span');
      btnGroup.className = 'contact-item-btns';
      btnGroup.appendChild(editBtn);
      btnGroup.appendChild(deleteBtn);
      li.appendChild(text);
      li.appendChild(btnGroup);
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

  function closeEditModal() {
    editModal.classList.remove('is-open');
    editModal.setAttribute('aria-hidden', 'true');
    editingIndex = null;
  }

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

  editSaveBtn.addEventListener('click', function () {
    var prefix = (editPrefix.value || '').trim();
    var name = (editName.value || '').trim();
    var number = (editNumber.value || '').trim();
    if (editingIndex !== null) {
      contacts[editingIndex] = { prefix: prefix, name: name, number: number };
      renderList();
    }
    closeEditModal();
  });

  editDeleteBtn.addEventListener('click', function () {
    if (editingIndex !== null) {
      contacts.splice(editingIndex, 1);
      renderList();
    }
    closeEditModal();
  });

  editCancelBtn.addEventListener('click', closeEditModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', closeEditModal);
  }

  editModal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeEditModal();
  });

  exportBtn.addEventListener('click', function () {
    editingIndex = null;
    exportContacts(contacts, function (exported) {
      if (exported && contacts.length > 0) {
        contacts = [];
        renderList();
      }
    });
  });

  resetListBtn.addEventListener('click', function () {
    contacts = [];
    editingIndex = null;
    closeEditModal();
    renderList();
  });

  renderList();
})();
