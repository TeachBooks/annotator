/**
 * Shows a confirmation dialog with a message and callback
 * @param {string} message - The message to display in the dialog
 * @param {Function} onConfirm - Callback function to execute when user confirms
 */
export function showConfirmationDialog(message, onConfirm) {
  const existingDialog = document.getElementById('confirmation-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }

  const dialog = document.createElement('div');
  dialog.id = 'confirmation-dialog';
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.backgroundColor = '#fff';
  dialog.style.padding = '20px';
  dialog.style.borderRadius = '5px';
  dialog.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
  dialog.style.zIndex = '10001';
  dialog.style.minWidth = '300px';
  dialog.style.textAlign = 'center';

  const messageElement = document.createElement('p');
  messageElement.style.marginBottom = '20px';
  messageElement.innerText = message;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.gap = '10px';

  const confirmButton = document.createElement('button');
  confirmButton.innerText = 'Confirm';
  confirmButton.style.padding = '8px 16px';
  confirmButton.style.backgroundColor = '#dc3545';
  confirmButton.style.color = '#fff';
  confirmButton.style.border = 'none';
  confirmButton.style.borderRadius = '4px';
  confirmButton.style.cursor = 'pointer';

  const cancelButton = document.createElement('button');
  cancelButton.innerText = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.backgroundColor = '#6c757d';
  cancelButton.style.color = '#fff';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.cursor = 'pointer';

  buttonContainer.appendChild(confirmButton);
  buttonContainer.appendChild(cancelButton);

  dialog.appendChild(messageElement);
  dialog.appendChild(buttonContainer);

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = '10000';

  document.body.appendChild(overlay);
  document.body.appendChild(dialog);

  confirmButton.addEventListener('click', () => {
    onConfirm();
    dialog.remove();
    overlay.remove();
  });

  cancelButton.addEventListener('click', () => {
    dialog.remove();
    overlay.remove();
  });

  overlay.addEventListener('click', () => {
    dialog.remove();
    overlay.remove();
  });
}
