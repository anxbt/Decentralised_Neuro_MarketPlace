const { getSynapseManager } = await import('/src/lib/synapseStorage.ts');
const mgr = getSynapseManager();
await mgr.initialize();
await mgr.approvePandoraService();

synapseStorage.ts:84 [Synapse] Initializing Synapse SDK with viem transport...
synapseStorage.ts:85 [Synapse] Wallet: 0xC1F39FAcbB12C6abE4082D1448A7E79132bC4853
synapseStorage.ts:95 [Synapse] Connected to Filecoin Calibration network ✅
synapseStorage.ts:242 [Synapse] Approving Pandora service...
synapseStorage.ts:250 [Synapse] Approval transaction submitted: 0x7ba2f159ef9a3522cc3ab8825c4b77104e404badb9b9071969fb638256697468
'0x7ba2f159ef9a3522cc3ab8825c4b77104e404badb9b9071969fb638256697468'
Upload.tsx:116 [Upload] Starting upload pipeline for dataset: dataset-1772687154390-6tn43
Upload.tsx:119 [Upload] Step 1: Encrypting file with Lit Protocol...
lit.ts:97 [Lit v8] Connecting to Naga Dev network...
lit.ts:110 [Lit v8] Connected to Naga Dev network successfully!
lit.ts:226 using deprecated parameters for `initSync()`; pass a single object instead
initSync @ chunk-RTECASOB.js?v=fc860ad0:181879
initWasm @ chunk-RTECASOB.js?v=fc860ad0:181931
loadModules @ chunk-RTECASOB.js?v=fc860ad0:181940
blsEncrypt @ chunk-RTECASOB.js?v=fc860ad0:181957
encrypt @ chunk-RTECASOB.js?v=fc860ad0:189171
_encrypt @ @lit-protocol_lit-client.js?v=fc860ad0:1425
await in _encrypt
encryptMessage @ lit.ts:226
await in encryptMessage
encryptFile @ lit.ts:270
await in encryptFile
encryptFile @ lit.ts:408
handleSubmit @ Upload.tsx:120
callCallback2 @ chunk-IFDJ2BO6.js?v=fc860ad0:10552
invokeGuardedCallbackDev @ chunk-IFDJ2BO6.js?v=fc860ad0:10577
invokeGuardedCallback @ chunk-IFDJ2BO6.js?v=fc860ad0:10611
invokeGuardedCallbackAndCatchFirstError @ chunk-IFDJ2BO6.js?v=fc860ad0:10614
executeDispatch @ chunk-IFDJ2BO6.js?v=fc860ad0:13892
processDispatchQueueItemsInOrder @ chunk-IFDJ2BO6.js?v=fc860ad0:13912
processDispatchQueue @ chunk-IFDJ2BO6.js?v=fc860ad0:13921
dispatchEventsForPlugins @ chunk-IFDJ2BO6.js?v=fc860ad0:13929
(anonymous) @ chunk-IFDJ2BO6.js?v=fc860ad0:14052
batchedUpdates$1 @ chunk-IFDJ2BO6.js?v=fc860ad0:25791
batchedUpdates @ chunk-IFDJ2BO6.js?v=fc860ad0:10457
dispatchEventForPluginEventSystem @ chunk-IFDJ2BO6.js?v=fc860ad0:14051
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-IFDJ2BO6.js?v=fc860ad0:12356
dispatchEvent @ chunk-IFDJ2BO6.js?v=fc860ad0:12350
dispatchDiscreteEvent @ chunk-IFDJ2BO6.js?v=fc860ad0:12327Understand this warning
Upload.tsx:121 [Upload] Encryption complete. Hash: 8cd8ce42d9c480c53d6b660977770c1bad0f367e935543d119e0898cce41afbd
Upload.tsx:125 [Upload] Step 2: Uploading to Filecoin storage...
synapseStorage.ts:84 [Synapse] Initializing Synapse SDK with viem transport...
synapseStorage.ts:85 [Synapse] Wallet: 0xC1F39FAcbB12C6abE4082D1448A7E79132bC4853
synapseStorage.ts:95 [Synapse] Connected to Filecoin Calibration network ✅
synapseStorage.ts:158 [Synapse] accountInfo returned: {funds: 20000000000000000000n, lockupCurrent: 0n, lockupRate: 0n, lockupLastSettledAt: 3512006n, availableFunds: 20000000000000000000n}
synapseStorage.ts:166 [Synapse] serviceApproval returned: {isApproved: true, rateAllowance: 1000000000000000000n, lockupAllowance: 100000000000000000000n, rateUsage: 0n, lockupUsage: 0n, …}
synapseStorage.ts:274 [Synapse] Setup check: deposit=true (20.0), approved=true
synapseStorage.ts:306 [Synapse] Uploading 2337820 bytes to Filecoin storage...
wagmi.ts:14  GET https://calib.ezpdpz.net/pdp/piece?pieceCid=bafkzcibe4stw6eiodmzl42s7gnnbfj3n2e3mbzjhh53kxzitmxl2h76tlmuk67fbhi 404 (Not Found)
window.fetch @ wagmi.ts:14
fn @ @filoz_synapse-sdk.js?v=fc860ad0:8810
pRetry.retries @ @filoz_synapse-sdk.js?v=fc860ad0:8826
pRetry @ @filoz_synapse-sdk.js?v=fc860ad0:8595
request @ @filoz_synapse-sdk.js?v=fc860ad0:8826
json2 @ @filoz_synapse-sdk.js?v=fc860ad0:8940
get2 @ @filoz_synapse-sdk.js?v=fc860ad0:8964
findPiece @ @filoz_synapse-sdk.js?v=fc860ad0:25933
store @ @filoz_synapse-sdk.js?v=fc860ad0:27407
await in store
upload @ @filoz_synapse-sdk.js?v=fc860ad0:27801
await in upload
uploadFile @ synapseStorage.ts:309
await in uploadFile
handleSubmit @ Upload.tsx:175
await in handleSubmit
callCallback2 @ chunk-IFDJ2BO6.js?v=fc860ad0:10552
invokeGuardedCallbackDev @ chunk-IFDJ2BO6.js?v=fc860ad0:10577
invokeGuardedCallback @ chunk-IFDJ2BO6.js?v=fc860ad0:10611
invokeGuardedCallbackAndCatchFirstError @ chunk-IFDJ2BO6.js?v=fc860ad0:10614
executeDispatch @ chunk-IFDJ2BO6.js?v=fc860ad0:13892
processDispatchQueueItemsInOrder @ chunk-IFDJ2BO6.js?v=fc860ad0:13912
processDispatchQueue @ chunk-IFDJ2BO6.js?v=fc860ad0:13921
dispatchEventsForPlugins @ chunk-IFDJ2BO6.js?v=fc860ad0:13929
(anonymous) @ chunk-IFDJ2BO6.js?v=fc860ad0:14052
batchedUpdates$1 @ chunk-IFDJ2BO6.js?v=fc860ad0:25791
batchedUpdates @ chunk-IFDJ2BO6.js?v=fc860ad0:10457
dispatchEventForPluginEventSystem @ chunk-IFDJ2BO6.js?v=fc860ad0:14051
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-IFDJ2BO6.js?v=fc860ad0:12356
dispatchEvent @ chunk-IFDJ2BO6.js?v=fc860ad0:12350
dispatchDiscreteEvent @ chunk-IFDJ2BO6.js?v=fc860ad0:12327Understand this error
wagmi.ts:14  GET https://calib.ezpdpz.net/pdp/piece?pieceCid=bafkzcibe4stw6eiodmzl42s7gnnbfj3n2e3mbzjhh53kxzitmxl2h76tlmuk67fbhi 404 (Not Found)
window.fetch @ wagmi.ts:14
fn @ @filoz_synapse-sdk.js?v=fc860ad0:8810
pRetry.retries @ @filoz_synapse-sdk.js?v=fc860ad0:8826
pRetry @ @filoz_synapse-sdk.js?v=fc860ad0:8595
await in pRetry
request @ @filoz_synapse-sdk.js?v=fc860ad0:8826
json2 @ @filoz_synapse-sdk.js?v=fc860ad0:8940
get2 @ @filoz_synapse-sdk.js?v=fc860ad0:8964
findPiece @ @filoz_synapse-sdk.js?v=fc860ad0:25933
store @ @filoz_synapse-sdk.js?v=fc860ad0:27407
await in store
upload @ @filoz_synapse-sdk.js?v=fc860ad0:27801
await in upload
uploadFile @ synapseStorage.ts:309
await in uploadFile
handleSubmit @ Upload.tsx:175
await in handleSubmit
callCallback2 @ chunk-IFDJ2BO6.js?v=fc860ad0:10552
invokeGuardedCallbackDev @ chunk-IFDJ2BO6.js?v=fc860ad0:10577
invokeGuardedCallback @ chunk-IFDJ2BO6.js?v=fc860ad0:10611
invokeGuardedCallbackAndCatchFirstError @ chunk-IFDJ2BO6.js?v=fc860ad0:10614
executeDispatch @ chunk-IFDJ2BO6.js?v=fc860ad0:13892
processDispatchQueueItemsInOrder @ chunk-IFDJ2BO6.js?v=fc860ad0:13912
processDispatchQueue @ chunk-IFDJ2BO6.js?v=fc860ad0:13921
dispatchEventsForPlugins @ chunk-IFDJ2BO6.js?v=fc860ad0:13929
(anonymous) @ chunk-IFDJ2BO6.js?v=fc860ad0:14052
batchedUpdates$1 @ chunk-IFDJ2BO6.js?v=fc860ad0:25791
batchedUpdates @ chunk-IFDJ2BO6.js?v=fc860ad0:10457
dispatchEventForPluginEventSystem @ chunk-IFDJ2BO6.js?v=fc860ad0:14051
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-IFDJ2BO6.js?v=fc860ad0:12356
dispatchEvent @ chunk-IFDJ2BO6.js?v=fc860ad0:12350
dispatchDiscreteEvent @ chunk-IFDJ2BO6.js?v=fc860ad0:12327Understand this error
synapseStorage.ts:312 [Synapse] Upload complete! PieceCID: bafkzcibe4stw6eiodmzl42s7gnnbfj3n2e3mbzjhh53kxzitmxl2h76tlmuk67fbhi
Upload.tsx:177 [Upload] Uploaded to Filecoin. PieceCID: bafkzcibe4stw6eiodmzl42s7gnnbfj3n2e3mbzjhh53kxzitmxl2h76tlmuk67fbhi
Upload.tsx:182 [Upload] Step 3: Registering on Filecoin FVM...
Upload.tsx:184 [Upload] Transaction submitted. Hash: 0x884be7fbca4892631fec001442a9127373895d1319d41ff246604d82c1ac13e3
Upload.tsx:188 [Upload] Transaction confirmed!
Upload.tsx:192 [Upload] Step 4: Storing metadata in backend...
api.ts:66 [API] POST http://localhost:3001/api/datasets {data: {…}}
api.ts:72 [API] POST http://localhost:3001/api/datasets -> 201 {id: 'dataset-1772687154390-6tn43', title: 'fd', description: 'No description provided', price: '0.98', cid: 'bafkzcibe4stw6eiodmzl42s7gnnbfj3n2e3mbzjhh53kxzitmxl2h76tlmuk67fbhi', …}
Upload.tsx:202 [Upload] Metadata stored in backend
Upload.tsx:207 [Upload] Upload pipeline complete!
api.ts:66 [API] GET http://localhost:3001/api/datasets 
api.ts:72 [API] GET http://localhost:3001/api/datasets -> 200 (7) [{…}, {…}, {…}, {…}, {…}, {…}, {…}]
Marketplace.tsx:100 Loaded 7 datasets from backend
api.ts:66 [API] GET http://localhost:3001/api/datasets/dataset-1772687154390-6tn43 
api.ts:72 [API] GET http://localhost:3001/api/datasets/dataset-1772687154390-6tn43 -> 200 {id: 'dataset-1772687154390-6tn43', title: 'fd', description: 'No description provided', price: '0.98', cid: 'bafkzcibe4stw6eiodmzl42s7gnnbfj3n2e3mbzjhh53kxzitmxl2h76tlmuk67fbhi', …}