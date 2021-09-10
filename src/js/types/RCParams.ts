export interface RCParams {
	paramString	: string, // Complete list of params.
	limit		: number,
	days		: number,
	hideminor	: boolean,
	hidebots	: boolean,
	hideanons	: boolean,
	hideliu		: boolean,
	hidemyself	: boolean,
	hideenhanced: boolean,
	hidelogs	: boolean,
	hidenewpages: boolean,
	hidepageedits: boolean,
	namespace	?: string,
}
export default RCParams;
