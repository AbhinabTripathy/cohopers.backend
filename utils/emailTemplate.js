exports.emailTemplate = ({
  clientName,
  companyName,
  amount,
  date,
  bookingType,
  status,
}) => {
  return `
    <h2>Booking Update - CoHopers</h2>

    <p><b>Status:</b> ${status}</p>
    <p><b>Client Name:</b> ${clientName || "N/A"}</p>
    <p><b>Company Name:</b> ${companyName || "N/A"}</p>
    <p><b>Booking Type:</b> ${bookingType}</p>
    <p><b>Date:</b> ${date}</p>
    <p><b>Amount:</b> ${amount ? `₹${amount}` : "N/A"}</p>

    <br/>

    <p>For any assistance:</p>
    <p><b> 9778708100 / 8328830398</b></p>
    <p><b> info@cohopers.in</b></p>
  `;
};
