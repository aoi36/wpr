document.addEventListener('DOMContentLoaded', () => {
  const selectAllCheckbox = document.getElementById('selectAll');
  const deleteButton = document.getElementById('deleteButton');
  const emailList = document.getElementById('emailList');

  function updateDeleteButton() {
    const checkedEmails = document.querySelectorAll('.emailCheckbox:checked');
    deleteButton.disabled = checkedEmails.length === 0;
  }

  selectAllCheckbox.addEventListener('change', () => {
    const emailCheckboxes = document.querySelectorAll('.emailCheckbox');
    emailCheckboxes.forEach(checkbox => {
      checkbox.checked = selectAllCheckbox.checked;
    });
    updateDeleteButton();
  });

  emailList.addEventListener('change', (event) => {
    if (event.target.classList.contains('emailCheckbox')) {
      updateDeleteButton();
    }
  });

  deleteButton.addEventListener('click', async () => {
    const checkedEmails = document.querySelectorAll('.emailCheckbox:checked');
    const emailIds = Array.from(checkedEmails).map(checkbox => checkbox.dataset.emailId);

    if (emailIds.length === 0) {
      alert('Please select at least one email to delete.');
      return;
    }

    try {
      const response = await fetch('/delete-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailIds }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Remove deleted emails from the page
          checkedEmails.forEach(checkbox => {
            const row = checkbox.closest('tr');
            row.remove();
          });

          // Update the "Select All" checkbox and delete button state
          selectAllCheckbox.checked = false;
          updateDeleteButton();

          alert('Emails deleted successfully.');
        } else {
          throw new Error(result.message);
        }
      } else {
        throw new Error('Failed to delete emails');
      }
    } catch (error) {
      console.error('Error deleting emails:', error);
      alert('An error occurred while deleting emails. Please try again.');
    }
  });

  // Initial update of delete button state
  updateDeleteButton();
});