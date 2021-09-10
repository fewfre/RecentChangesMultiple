import RCMManager from "./RCMManager";
import Global from "./Global";
const { jQuery:$, mediaWiki:mw } = window;

const TIMEOUT = 15000; // Error out after 15s

type ErrorType<T> = { id:"unknown", error:any, tries:number }
| { id:"max-tries", erroredItem:T, tries:number, status?:string }
| { id:"timeout", tries:number };

type InvalidCheckResponse = false|{ id:string }|{ halt:true, id:string, error:any };

type RetryFunc = (prevTries:number)=>void;

type JsonResponse = { [key:string]:any } & any[];

interface MultiLoadProps<T> {
	list:T[];
	buildUrl:(o:T)=>string;
	dataType?:"json"|"jsonp";
	maxTries:number;
	
	onCheckInvalid:(data:JsonResponse, item:T)=>InvalidCheckResponse;
	onProgress:(perc:number)=>void;
	onSingleLoadFinished:(data:JsonResponse, item:T)=>void;
	onSingleError:(info:ErrorType<T>, item:T, errorData:ErroredItemData<T>)=>void; // When this is called the whole multiLoad call will fail too; but since promises can only fail once, this lets multiple fails go through
}

interface SingleLoadProps<T> {
	item:T;
	url:string;
	dataType:"json"|"jsonp";
	tries?:number;
	maxTries:number;
	
	onCheckInvalid:(data:JsonResponse, item:T)=>InvalidCheckResponse;
}

interface ErroredItemData<T> { tries:number, item:T, retry:RetryFunc, remove:()=>void }

//######################################
// #### MultiLoader ####
// * A loader that loads a list of items all at once
// * Checks for errors, auto retries, and has progress handlers
//######################################
export default class MultiLoader<T>
{
	// Storage
	private state : "idle"|"running";
	private ajaxID : number;
	private totalItemsToLoad : number;
	private itemsLoaded : number;
	private delayStack : number; // The current delay used by last ajax call
	private maxTries : number;
	private erroredItems: ErroredItemData<T>[];
	
	get AjaxID() { return this.ajaxID; }
	get ErroredItems() { return this.erroredItems; }
	
	// constructor
	constructor(public manager:RCMManager){
		this.state = "idle";
		this.ajaxID = this.manager.ajaxID;
		
		// Default values
		this.totalItemsToLoad = 0;
		this.itemsLoaded = 0;
		this.delayStack = 0;
		this.maxTries = 0;
		this.erroredItems = [];
	}
	
	/***************************
	* Main Methods
	***************************/
	/**
	 * Loads multiple urls at once based on objects passed in
	 * Various status functions passed in to get play-by-play
	 * ------
	 * Note: This promise NEVER fails; instead it returns an array of true/false based on if each call was successful or not
	 * This is because we need to know when the remaining calls have all finished, and lets users retry failed ones
	 * `onSingleLoadFinished` can be checked for error status
	 */
	multiLoad({ list, buildUrl, onCheckInvalid, onProgress, onSingleLoadFinished, onSingleError, maxTries, dataType="jsonp" }:MultiLoadProps<T>) : Promise<void[]> {
		if(this.state === "running") { console.error("[RCM] Loader started while loader already running"); return Promise.reject(); }
		if(list.length == 0) { return Promise.resolve([]); } // Length should really be checked beforehand, but this is a sanity check
		this.state = "running";
		this.ajaxID = this.manager.ajaxID;
		this.totalItemsToLoad = list.length;
		this.itemsLoaded = 0;
		this.delayStack = 0;
		this.maxTries = maxTries;
		this.erroredItems = [];
		onProgress(0);
		
		// Return a promise all which only resolves when the promise for each item to be loaded is solved
		return Promise.all(list.map(item => new Promise<void>((resolve, reject)=>{
			let url = buildUrl(item);
			// This is a function so it can be retried if failed multiple times in a row
			const doSingleLoad = (tries:number)=>{
				this.singleLoadWithRetries({ url, item, onCheckInvalid, tries, maxTries:this.maxTries, dataType })
				.then((data)=>{
					this.itemsLoaded++;
					onProgress( this.getProgress() );
					onSingleLoadFinished(data, item);
					resolve();
				})
				["catch"]((e:ErrorType<T>)=>{
					// We never want to actually fail this promise, since there might be other wikis still loading.
					// Instead, we want to keep track of failed wikis, and also signal to outside that there was an error found on a specific item
					const errorData = { tries:e.tries, item, retry:doSingleLoad, remove:()=>{
						// Skip the issue and move on
						this.totalItemsToLoad--;
						onProgress( this.getProgress() );
						resolve();
					} };
					this.erroredItems.push(errorData);
					onSingleError(e, item, errorData);
				});
			};
			doSingleLoad(0);
		})));
	}
	
	// Does a single ajax call, including retires and various error checks
	// Promise only returns false when either tries are out are a hard error is found
	private singleLoadWithRetries({ url, item, onCheckInvalid, tries=0, maxTries, dataType }:SingleLoadProps<T>) : Promise<any> {
		return new Promise((resolve, reject)=>{
			// We pass max tries in encase it's increased during a retry
			const doSingleLoad = (tries:number)=>{
				tries++;
				const doReject = (reason:ErrorType<T>)=>reject(reason);
				// We use a delay to seperate ajax calls instead of chaining them to allow multiple to load at once
				// So long as we don't do them to quickly fandom doesn't care and we're slightly faster
				this.ajaxLoad(url, dataType, this.getNextDelay())
				.then((data)=>{
					let invalid = onCheckInvalid(data, item);
					if(invalid) {
						if("halt" in invalid && invalid.halt === true) {
							return doReject({ id:"unknown", error:invalid.error, tries });
						}
						
						if("servername" in item) mw.log(`Error parsing ${(item as any).servername} (${tries}/${maxTries} tries)`);
						if(tries >= maxTries) {
							return doReject({ id:"max-tries", erroredItem:item, tries });
						}
						// retry
						return doSingleLoad(tries);
					}
					
					// Success!
					resolve(data);
				})
				["catch"]((status)=>{
					if(status === "timeout") { return doReject({ id:"timeout", tries }); }
					
					if("servername" in item) mw.log(`Error loading ${(item as any).servername} (${tries}/${maxTries} tries)`);
					if(tries >= maxTries) {
						return doReject({ id:"max-tries", erroredItem:item, tries, status });
					}
					// retry
					return doSingleLoad(tries);
				});
			};
			doSingleLoad(tries);
		});
	}
	
	// Do an ajax load that's auto canceled if ajaxIDs go out of sync
	// Has built in delay feature needed to prevent fandom kicking us for loading to many wikis at once
	private ajaxLoad(url:string, dataType:string, delay:number=0) : Promise<any> {
		const id = this.ajaxID;
		return new Promise((resolve, reject)=>{
			// A timeout is used instead of loading 1 at a time to save time, as it allows some loading overlap.
			// A timeout is needed since Wikia wikis share a "request overload" detector, which can block your account from making more requests for awhile.
			setTimeout(() => {
				$.ajax({ type:'GET', url, dataType, timeout:TIMEOUT, data:{} })
				.done((data) => {
					// Make sure this isn't something loaded before the script was last refreshed.
					if(this.checkStop(id)) { return; }
					resolve(data);
				})
				.fail((data, status) => {
					// Make sure this isn't something loaded before the script was last refreshed.
					if(this.checkStop(id)) { return; }
					reject(status);
				});
			}, delay);
		});
	}
	
	// Retry all failed wikis by starting the recursion again
	retry(incMaxTries:number) : void {
		this.maxTries += incMaxTries;
		this.delayStack = 0; // might cause a little overlap if other wikis calls still being sent, but should be fine in most cases
		this.erroredItems.forEach(({ tries, retry })=>retry(tries));
		this.erroredItems = [];
	}
	
	// Cancel all failed wikis
	removeAllErroredWikis() : void {
		this.erroredItems.forEach(({ remove })=>remove());
		this.erroredItems = [];
	}
	
	getProgress() : number {
		return Math.round(this.itemsLoaded / this.totalItemsToLoad * 100);
	}
	
	// To stop just update ajaxID in manager
	// public stop() : void {
	// 	this.ajaxID = -1; // ajaxID should never be negative, so this will always trigger a stop during id comparison
	// 	this.state = "idle";
	// } 
	
	/***************************
	* Helpers
	***************************/
	private checkStop(ajaxID:number) : boolean {
		return ajaxID != this.manager.ajaxID;
	}
	
	// Get the last delay, add a little more time to it, then return the new delay
	// Used in ajax calls
	private getNextDelay() : number {
		return this.delayStack += Global.loadDelay;
	}
}