// Utility functions for notice period logic

/**
 * Calculate notice status for a booking using variable period
 * @param {Object} booking
 * @returns {{ isInNotice: boolean, daysRemaining: number|null, expireDate: Date|null, noticeSubmittedDate: Date|null }}
 */
const getNoticeStatus = (booking) => {
  if (!booking || !booking.noticeSubmittedDate || booking.status !== 'Notice Given') {
    return { isInNotice: false, daysRemaining: null, expireDate: null, noticeSubmittedDate: null };
  }
  const noticeDate = new Date(booking.noticeSubmittedDate);
  const periodDays = Number(booking.noticePeriodDays) > 0 ? Number(booking.noticePeriodDays) : 30;
  const expireDate = new Date(noticeDate.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const today = new Date();
  const daysRemaining = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
  return {
    isInNotice: daysRemaining > 0,
    daysRemaining: Math.max(0, daysRemaining),
    expireDate,
    noticeSubmittedDate: noticeDate
  };
};

/**
 * Check if a space has an active notice period within provided bookings
 * @param {number} spaceId
 * @param {Array<Object>} bookings
 * @returns {{ hasNotice: boolean, daysRemaining: number|null, expireDate: Date|null, currentBooking: Object|null }}
 */
const hasActiveNotice = (spaceId, bookings) => {
  const active = Array.isArray(bookings)
    ? bookings.find(b => b.spaceId === spaceId && b.status === 'Notice Given' && b.noticeSubmittedDate)
    : null;
  if (!active) {
    return { hasNotice: false, daysRemaining: null, expireDate: null, currentBooking: null };
  }
  const status = getNoticeStatus(active);
  return {
    hasNotice: status.isInNotice,
    daysRemaining: status.daysRemaining,
    expireDate: status.expireDate,
    currentBooking: active
  };
};

module.exports = { getNoticeStatus, hasActiveNotice };
