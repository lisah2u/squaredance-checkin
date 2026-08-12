// Matches the naming convention already used in the live base
// (see Build Progress Log 2026-08-11): "Square Dance MM/DD/YYYY".
export function todaysEvent(date = new Date()) {
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	const yyyy = date.getFullYear();
	return {
		visitDate: `${yyyy}-${mm}-${dd}`,
		eventName: `Square Dance ${mm}/${dd}/${yyyy}`
	};
}
