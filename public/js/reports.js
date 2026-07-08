// Handles CSV downloads from the admin reports dashboard
async function triggerCsvExport(e) {
  e.preventDefault();

  const type = document.getElementById('export-report-type').value;
  const token = localStorage.getItem('token');

  if (!token) {
    alert('Session expired. Please sign in again.');
    return;
  }

  try {
    const response = await fetch(`/api/dashboard/export?type=${type}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${type}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      window.URL.revokeObjectURL(url);
    } else {
      const res = await response.json();
      alert(res.message || 'Failed to export report CSV.');
    }
  } catch (error) {
    console.error('Report export failure:', error);
    alert('Error generating data export file.');
  }
}
