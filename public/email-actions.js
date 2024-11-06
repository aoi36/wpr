document.addEventListener('DOMContentLoaded', () => {
  const selectAllCheckbox = document.getElementById('selectAll');
  const deleteButton = document.getElementById('deleteButton');
  const emailList = document.getElementById('emailList');
  const emailCheckboxes = document.querySelectorAll('.emailCheckbox');

  function updateDeleteButton() {
      const checkedEmails = document.querySelectorAll('.emailCheckbox:checked');
      deleteButton.disabled = checkedEmails.length === 0;
  }

  function updateEmailIndices() {
      const emailRows = emailList.querySelectorAll('tr');
      emailRows.forEach((row, index) => {
          const indexCell = row.querySelector('.email-index');
          if (indexCell) {
              indexCell.textContent = (index + 1).toString();
          }
      });
  }

  function updateSelectAllCheckbox() {
      const totalCheckboxes = emailCheckboxes.length;
      const checkedCheckboxes = document.querySelectorAll('.emailCheckbox:checked').length;
      selectAllCheckbox.checked = totalCheckboxes === checkedCheckboxes;
      selectAllCheckbox.indeterminate = checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes;
  }

  selectAllCheckbox.addEventListener('change', () => {
      emailCheckboxes.forEach(checkbox => {
          checkbox.checked = selectAllCheckbox.checked;
      });
      updateDeleteButton();
  });

  emailList.addEventListener('change', (event) => {
      if (event.target.classList.contains('emailCheckbox')) {
          updateDeleteButton();
          updateSelectAllCheckbox();
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

                  // Update email indices
                  updateEmailIndices();

                  // Update the "Select All" checkbox and delete button state
                  updateSelectAllCheckbox();
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

  // Initial update of delete button and select all checkbox state
  updateDeleteButton();
  updateSelectAllCheckbox();
});
