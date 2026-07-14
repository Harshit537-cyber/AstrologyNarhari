const DEACTIVATION_REASONS = [
    'Taking a break',
    'Privacy concerns',
    'Found a better app',
    'Not satisfied with service',
    'Temporary personal reasons',
    'Other'
];

const ALLOWED_DURATIONS = [7, 15, 30]; // duration optional hai - null bhi allowed (indefinite)

module.exports = { DEACTIVATION_REASONS, ALLOWED_DURATIONS };