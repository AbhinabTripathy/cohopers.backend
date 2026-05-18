exports.emailTemplate = ({
  clientName,
  companyName,
  amount,
  negotiatedAmount,
  depositedAmount,
  date,
  bookingType,
  status,
}) => {
  const showBreakdown =
    negotiatedAmount !== undefined &&
    negotiatedAmount !== null &&
    depositedAmount !== undefined &&
    depositedAmount !== null;

  const totalPayable = showBreakdown
    ? Number(negotiatedAmount) + Number(depositedAmount)
    : null;

  const amountSection = showBreakdown
    ? `
    <p><b>Negotiated Amount:</b> ₹${Number(negotiatedAmount).toLocaleString("en-IN")}</p>
    <p><b>Deposited Amount:</b> ₹${Number(depositedAmount).toLocaleString("en-IN")}</p>
    <p><b>Total Payable:</b> ₹${totalPayable.toLocaleString("en-IN")}</p>`
    : `<p><b>Amount:</b> ${amount ? `₹${amount}` : "N/A"}</p>`;

  return `
    <h2>Booking Update - CoHopers</h2>

    <p><b>Status:</b> ${status}</p>
    <p><b>Client Name:</b> ${clientName || "N/A"}</p>
    <p><b>Company Name:</b> ${companyName || "N/A"}</p>
    <p><b>Booking Type:</b> ${bookingType}</p>
    <p><b>Date:</b> ${date}</p>
    ${amountSection}

    <br/>

    <p>For any assistance:</p>
    <p><b> 9778708100 / 8328830398</b></p>
    <p><b> info@cohopers.in</b></p>
  `;
};
