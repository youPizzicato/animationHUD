//==============================
//正規表現パターン
//==============================
//数字と判断する
const g_allNumericRegExp = /^[\d#\. ]+$/;

//最後の優先度を含んだ数字を削除
//	'Aiko Animation 1 Priority 4'
//		↓
//	'Aiko Animation 1'
const g_delPriorityRegExp = /^(.*[a-z][^a-z]+)[ ]*(P|Prio|Priority|V|Version)[ ]*[^a-z]+$/i;
//最後の数字などを除去
//	'STUN Anim - Malvene 1'
//		↓
//	'STUN Anim - Malvene'
const g_delLastNumericRegExp = /^(.*[a-z])([^a-z]+)$/i;

const g_sameLimitLength = 2;

//==============================
//個人的によく使うお店の場合、Shop名を記入しておく
//==============================
//※animationHUDShopName.jsで初期化する
let g_shopInfo = new Object();

//==============================
//ポーズ情報
//==============================
let g_idx2O = new Array();	//index(0～) -> object
let g_nm2O = new Object();	//ポーズ名 -> object

//正規化した名前→素の名前の変換配列
let g_objNormalizationNameList = null;
//==============================
//クリエーター名を指すcss class Id
//==============================
//creator uuid -> object
let g_uuid2O = new Object();
//==============================
//グループ名リスト（ソート済）
//==============================
let g_groupNames = null;

//==============================
//load後のオブジェクトの格納
//==============================
let g_objHead,g_poseTreeList,g_poseFlatList,g_selTimer,g_btnPlay,g_btnTimer,g_btnGroup,g_btnVariation,g_selCreator;
let g_btnTree;
let g_btnSay;
let g_searchText;
let g_objMain;
let g_scrollHeight;

//==============================
//要素作成後のオブジェクトの格納
//==============================
let g_namesPoses;
let g_namesPosesFlat;
let g_targetNameList;
//==============================
//連携用
//==============================
const g_dataTypeINIT = 'INIT';
const g_dataTypeLIST = 'LIST';
const g_dataTypeCREATOR = 'CREATOR';
//let g_renkeiTid = null;
let g_totalCount = 0;
let g_currentIndex = 0;

//==============================
//進捗状況表示
//==============================
let g_progressBar;
let g_progressValue = 0;;

let g_receiveEnd = false;
let g_receiveId = null;
const receiveMS = 200;

//==============================
//システムであらかじめつくった上位グループ
//==============================
//	システムグループ名:システムグループに属するグループの情報が１つ(※)入っている
//	※上位グループの情報を参照するだけなので、複数あっても同じなので１つだけでいい。
//	※万が一、従来ロジックで作られたグループ名と重複しないように'|'を含む名前にしている
let g_systemGroupList = new Object();
const g_numericGroupName = '#number |* system group *|';	//数値グループの上位
g_systemGroupList[g_numericGroupName] = null;

//==============================
//よく使うIDなどなど
//==============================
//ポーズ格納DIVのID
const g_IdFlatList = 'dPoseFlatList';
const g_IdTreeList = 'dPoseTreeList';

const g_TagGroupTag = 'csGroupTag';

//==============================
//debug用
//==============================
const g_isLocal = (location.href).startsWith('file://');


//自動順送り
function timerAction(){
	if( typeof timerAction.tId == 'undefined' ){
		timerAction.tId = null;
	}
	clearInterval(timerAction.tId);
	if(g_btnTimer.checked){
		//一回目はすぐに実行
		cursorAction();
		//二回目以降の設定
		timerAction.tId = setInterval(cursorAction,g_selTimer.value*1000);
	}
}

//現在選択されているradioの番号を求める（0～
function getCursorIndex(){
	for(let i=0,len=g_targetNameList.length;i<len;++i){
		if(g_targetNameList[i].checked){
			return i;
		}
	}
	return -1;
}

function getScrollTarget(argCurIndex){
	if(argCurIndex<0){
		return null
	}
	let indexNo = g_targetNameList[argCurIndex].custIndexNo;
	let objPose = g_idx2O[indexNo];
	if(g_btnTree.checked){
		return objPose.pElmScrollTarget;
	}
	return objPose.pElmFlatScrollTarget;
}

//スクロール位置調整
function myScrollTo(argScrollTarget){
	if(argScrollTarget == null){
		return;
	}
	let poseList = (g_btnTree.checked)?g_poseTreeList:g_poseFlatList;

	let currentOffsetTop = argScrollTarget.offsetTop - poseList.offsetTop;
	let isUnder	= (poseList.scrollTop < currentOffsetTop);
	let isOver	= ((currentOffsetTop + argScrollTarget.clientHeight) < (poseList.scrollTop + g_scrollHeight));

	if(! isUnder){
		poseList.scrollTop = currentOffsetTop - poseList.clientHeight + argScrollTarget.clientHeight;
	}else if(! isOver){
		poseList.scrollTop = currentOffsetTop;
	}
}

//カーソル位置に移動
function moveCurrentIndex(){
	myScrollTo(getScrollTarget(getCursorIndex()));
}


//argIsTopBottom	argIsPrev
//	true			true		TOP
//	true			false		BOTTOM
//	false			true		ひとつ前
//	false			false		ひとつ後(引数なしの場合の動作)
function cursorAction(argIsPrev=false,argIsTopBottom=false){
	//現在行を取得
	let curIndex = getCursorIndex();
	const indexMax = (g_targetNameList.length - 1);

	let objScrollTarget = null;

	//行の表示の有無
	function isHiddenRow(argCurIndex){
		objScrollTarget = getScrollTarget(argCurIndex);
		if(objScrollTarget == null){
			return false;
		}
		return (objScrollTarget.clientHeight<=0);
	}

	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/

	let isSearchNext = true;
	if(argIsTopBottom){
		isSearchNext = false;
		if(isHiddenRow((curIndex = (argIsPrev) ? 0 : indexMax))){
			isSearchNext = true;
			argIsPrev = ! argIsPrev;
		}
	}

	if(isSearchNext){
		const addVal = (argIsPrev) ? -1:1;
		//全て非表示の場合もあるので、最大一周までに限定している
		for(let i=0,len=g_targetNameList.length;i<len;++i){
			curIndex += addVal;
			if(curIndex<0){curIndex = indexMax;
			}else if(curIndex>indexMax){curIndex = 0;
			}
			if(!isHiddenRow(curIndex)){
				break;
			}
		};
	}

	myScrollTo(objScrollTarget);

	g_targetNameList[curIndex].checked = true;
	//アニメショーン情報の送信
	sendCommand('CTRL',g_targetNameList[curIndex].custIndexNo);
}

//指定のIDのスタイルシートを追加する
function addStyleElement(styleId,textRuleString){
	let objStyle = document.createElement('style');
	objStyle.media = 'screen';
	objStyle.type = 'text/css';
	objStyle.id = styleId;
	objStyle.appendChild(document.createTextNode(textRuleString));

	g_objHead.appendChild(objStyle);
}

//指定のIDのスタイルシートを削除する
function delStyleSheet(argStyleId){
	let objStyle = document.getElementById(argStyleId);
	if(objStyle != null){
		g_objHead.removeChild(objStyle);
	}
}

function setCreatorList(){
	//現在行を取得
	let curIndex = getCursorIndex();
	if(curIndex<0){
		return;
	}
	let indexNo = g_targetNameList[curIndex].custIndexNo;

	let objPose = g_idx2O[indexNo];
	let objRegExpCssTag = new RegExp('\\.' + objPose.pCreatorInfo.pCssTag + '\\b');

	let creatorOptions = g_selCreator.options;
	for(let i=0,len=creatorOptions.length;i<len;++i){
		if((creatorOptions[i].value).match(objRegExpCssTag)){
			creatorOptions[i].selected = true;
			break;
		}
	}
	changeCreator();
}

function clearCreatorList(){
	let creatorOptions = g_selCreator.options;
	creatorOptions[0].selected = true;
	changeCreator();

	moveCurrentIndex();	//カーソル位置に移動
}

function playCtrl(){
	const styleId = 'cssStopColor'
	delStyleSheet(styleId);

	let curIndex = -1;	//停止を送信
	if(! g_btnPlay.checked){
		//stop処理
		addStyleElement(styleId
							,'.csPoseRdo:checked + .csPoseLbl'
							+ ', .csPoseRdo:checked + .csVarLbl{background-color: var(--mClCurPlayOff);}'
							);

	}else{
		//再開処理
		let nameIndex = getCursorIndex();
		if(nameIndex in g_targetNameList){
			curIndex = g_targetNameList[nameIndex].custIndexNo;
		}
	}
	sendCommand('CTRL',curIndex);
}


//製作者リスト切替処理
function changeCreator(){
	const styleId = 'cssCreator';
	delStyleSheet(styleId);
	if(g_selCreator.value == 'all'){
		//削除を実行したら処理を終わる
		return;
	}

	//全体表示はOFFにする
	//製作者指定されているものをONにする
	addStyleElement(styleId,  '.' + g_TagGroupTag		+ '{display:none;}'
							+ g_selCreator.value	+ '{display:block;}'
							);
}

function changeDisplayMode(){
	const styleId = 'cssDisplayFlat';
	delStyleSheet(styleId);

	g_targetNameList = g_namesPosesFlat;
	let targetDisplayTag = '.csFlatCommon';
	let targetHiddenTag = '.csTreeCommon';
	if(g_btnTree.checked){
		g_targetNameList = g_namesPoses;
		targetDisplayTag = '.csTreeCommon';
		targetHiddenTag = '.csFlatCommon';
	}

	addStyleElement(styleId,targetDisplayTag + ' {display: block;}'+targetHiddenTag + ' {display: none;}');

	g_btnVariation.disabled = g_btnGroup.disabled = ! g_btnTree.checked;
	g_searchText.disabled = g_btnTree.checked;
	setIconColor('--mClIconSearch',g_searchText.disabled);


	g_targetNameList = (g_btnTree.checked)?g_namesPoses:g_namesPosesFlat;
}

function openCloseWaku(argTragetId=null,argChecked=null) {
	function dispFunc(argTarget){
		document.getElementById(argTarget.custId).style.display = (argTarget.checked)?'block':'none';
	}

	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/

	let objTarget = null;
	let targetId = null;
	if( typeof argTragetId=='string'){
		targetId = argTragetId;
	}else{
		objTarget = event.target;
		targetId = objTarget.id;
	}
	if((targetId=='btnVariation')||(targetId=='btnGroup')){
		let objCheckItem = document.getElementById(targetId);
		if(argChecked!=null){
			objCheckItem.checked = argChecked;
		}

		//btnVariationList / btnGroupList
		let objNameList = document.getElementsByName(targetId + 'List');
		//↓ここはfor inにするとプロパティも入ってくるので注意
		for(let i=0,len=objNameList.length;i<len;++i){
			let oneTarget = objNameList[i];
			oneTarget.checked = objCheckItem.checked;

			dispFunc(oneTarget);
		}
	}else{
		dispFunc(objTarget);
	}
}

//argDataType	g_dataTypeINIT		:初回総件数要求
//				g_dataTypeLIST		:個別のポーズ情報を要求
//				g_dataTypeCREATOR	:製作者UUID変換
function requestList(argDataType,argCreatorUuidCsv,argCurrentIndex){

	let requestData = null;
	switch(argDataType){
	case g_dataTypeINIT	:
		requestData = g_dataTypeINIT;
		break;
	case g_dataTypeLIST	:
		requestData = g_dataTypeLIST + ',' + argCurrentIndex;
		break;
	case g_dataTypeCREATOR	:
		requestData = g_dataTypeCREATOR + argCreatorUuidCsv;
		break;
	}

	if(!g_isLocal){
		$.ajax(
			{
				'type': 'POST'
				,'url': location.href
				,'data': requestData
			}
		).done(
			function(data) {
				receiveJsonData(JSON.parse(data));
				//g_renkeiTid = setInterval(receiveJsonData,0,JSON.parse(data));
			}
		).fail(
			function(data) {
				if (data.status == 504) {
					// timeout -> retry
					requestList(argDataType,argCreatorUuidCsv,argCurrentIndex);
				}
			}
		);
	}else{
		switch(argDataType){
		case g_dataTypeINIT	:
			g_sampleJsonIndex = 0;
		case g_dataTypeLIST	:
		case g_dataTypeCREATOR	:
			receiveJsonData(g_sampleJson[g_sampleJsonIndex++]);
			break;
		}
	}
}

//Jsonデータの受信
async function receiveJsonData(argJsonData){
	//名称などが不明なUUIDがあれば、要求リストを作成する
	function makeUuidCsv(){
		//一回に送る最大件数
		//※llRequestAgentDataには0.1秒のディレイがあり
		//	問い合わせ結果が返ってくる前の時間を考えるとあまり大きくはできない。
		const maxCount = 20;
		let cnt = 0;
		let csvData = '';
		for(let oneUuid in g_uuid2O){
			let objCreator = g_uuid2O[oneUuid];
			if(objCreator.pName==null){
				//未解決の「UUID→名前」がある場合、要求を行い、関数を終了する。

				csvData += ',' + oneUuid;
				if(++cnt >= maxCount){
					return csvData;
				}
			}
		}
		return csvData;
	}

	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
	//clearInterval(g_renkeiTid);

	if(argJsonData.dType==g_dataTypeINIT){
		//初期処理
		//総レコード数が返ってくる

		//トータルレコード数
		g_totalCount = argJsonData.COUNT;
		updateProgress(g_totalCount);

		//ゼロ件の場合の処理をいれること
		//→基本的にゼロ件の時は動かないようになっている。

		if(g_currentIndex < g_totalCount){
			//初回連携開始
			requestList(g_dataTypeLIST,null,(g_currentIndex = 0));
		}
	}else{
		//以下の処理
		//・ポーズ情報
		//・製作者情報

		g_currentIndex += await makePoseInfo(argJsonData);

		//Uuid送信用CSVデータを作成する
		let sendUuidCsv = makeUuidCsv();
		if(sendUuidCsv != ''){
			requestList(g_dataTypeCREATOR,sendUuidCsv,0);
			return;
		}

		if(g_currentIndex < g_totalCount){
			//ポーズリストの最後まで到達していない場合、要求を行い、関数を終了する。
			requestList(g_dataTypeLIST,null,g_currentIndex);
			return;
		}

		//データ全件受信完了
		g_receiveEnd = true;
	}
}

function changeSayMode(){
	if(g_btnSay.checked){
		sendCommand('SAY');
	}else{
		sendCommand('NOSAY');
	}
}

//コマンドを送信する
//アニメーション再生指示を送る
//	argIndexNo	-1：停止を送信
//				0以降：in worldのコンテンツ内のポーズ番号
//最小化指示を送る
function sendCommand(argAction,argIndexNo){
	let command = argAction;
	if(argAction=='CTRL'){
		let sendAnimationName = '';
		if(argIndexNo in g_idx2O){
			let objPose = g_idx2O[argIndexNo];
			sendAnimationName = objPose.pName;
		}
		command = 'CTRL,' + sendAnimationName;
		console.log(command);
	}
	if(argIndexNo>=0){
		//再生指示
		if(! g_btnPlay.checked){
			//停止状態なら送らない
			return;
		}
	}
	if(!g_isLocal){
		$.ajax(
			{
				'type': 'POST'
				,'url': location.href
				,'data' : command
			}
		).done(
			function(data) {
				//何もしない
				if((data=='SAY')||(data=='NOSAY')){
					g_btnSay.checked = (data=='SAY');
				}
			}
		).fail(
			function(data) {
				if (data.status == 504) {
					// timeout -> retry
					sendCommand(argAction,argIndexNo);
				}
			}
		);
	}else{
		console.log('sendCommand:['+command+']');
	}
}


//JSON情報をオブジェクトに変換
async function makePoseInfo(argJsonData){
	let addPoseCount = 0;
	if(argJsonData.dType == g_dataTypeCREATOR){

		//製作者情報リスト（'|'区切り）を分割
		let creatorListPsv = (argJsonData.uuidList).split('|');
		for(let i=0,len=creatorListPsv.length;i<len;i+=2){
			let creatorName = unescape(creatorListPsv[i]);
			let creatorUuid = unescape(creatorListPsv[i+1]);
			let objCreator = g_uuid2O[creatorUuid];
			//console.log(creatorUuid+':'+creatorName+':'+objCreator);
			objCreator.pName = creatorName.replace(/ Resident$/,'');	//製作者名末尾の'Resident'は不要
		}

		return addPoseCount;
	}

	//名前の正規化
	//
	function normalizationName(argPoseName){
		let normalName = argPoseName.trim();

		//区切り文字の前後の空白を削除する
		normalName = normalName.replace(/[ ]*(\W)[ ]*/g,'$1');

		//連続した空白をまとめる
		normalName = normalName.replace(/[ ][ ]*/g,' ');

		//先頭の記号を削除
		normalName = normalName.replace(/^[^a-z0-9]+([a-z0-9]+.*$)/i,'$1');


		//番号から始まっていたら
		//※以下のパターンへの対応
		//	'1. OG. Alone'
		//	'1. M OG. Alone'
		const sapaPattern = /^\d+(\.\d+|#\d+)/;
		if(!normalName.match(sapaPattern)){
			const seqCheck01 = /^((?:#|No)?\d+[\.]?)(.*)$/i;
			if(normalName.match(seqCheck01)){
				let partNumber = normalName.replace(seqCheck01,'$1');
				let partName = normalName.replace(seqCheck01,'$2');
				const seqCheck02 = /^(M)[ ]+(.*)$/i;
				if(partName.match(seqCheck02)){
					let partVariation = partName.replace(seqCheck02,'$1');
					partName = partName.replace(seqCheck02,'$2');

					normalName = partName + ' ' + partNumber + ' ' + partVariation;
				}else{
					normalName = partName + ' ' + partNumber;
				}
			}
		}

		return normalName;
	}

	//比較用にポーズ名を加工する
	function modifyForCompare(argPoseName){
		let returnPoseName = argPoseName;
		//プライオリティっぽいものを消す
		returnPoseName = returnPoseName.replace(g_delPriorityRegExp,'$1');

		//数字っぽいものを消す
		returnPoseName = returnPoseName.replace(g_delLastNumericRegExp,'$1');
		return returnPoseName;
	}

	//animation情報格納用のオブジェクト作成
	function makeObjPose(argIndexNo,argPoseName,argCreatorUuid) {
		//製作者情報の作成
		if(!(argCreatorUuid in g_uuid2O)){

			//製作者用cssタグの連番（0～
			let creatorSeq = Object.keys(g_uuid2O).length;

			let creatorName = null;
			let shopName = null;
			if(argCreatorUuid in g_shopInfo){
				creatorName = g_shopInfo[argCreatorUuid].pName.replace(/ Resident$/,'');	//製作者名末尾の'Resident'は不要;
				shopName = g_shopInfo[argCreatorUuid].pShopName;
			}

			//console.log('set g_uuid2O['+argCreatorUuid+']');
			g_uuid2O[argCreatorUuid] = {
				 pNo : creatorSeq
				,pCssTag : 'css_creator_' + creatorSeq
				,pName : creatorName		//nullの場合、名前要求をする
				,pShopName:shopName
			}
		}
		let objCreator = g_uuid2O[argCreatorUuid];

		//名前の正規化
		let normalName = normalizationName(argPoseName);
		let modName = modifyForCompare(normalName);
		//console.log('argPoseName:['+argPoseName+']normalName:['+normalName+']modName:['+modName+']');

		let objPose = {
				//連携情報
				 pIndexNo : argIndexNo		//HUDのコンテンツ内の連番(0～
				,pName : argPoseName		//ポーズ名
				,pUuid : argCreatorUuid		//製作者UUID
				,pNormalizationName : normalName	//正規化した名前
				,pModifyForCompare : modName		//比較用の加工文字列
				,pNameForSearch : argPoseName.toLowerCase()

				//表示用文字列
				//※バリエーションだと判定された場合加工される
				,pDisplayName : argPoseName

				//バリエーション情報
				,pIsParent : false			//バリエーションが存在する
				,pVariationNameList : null	//バリエーションの名前リスト(ソート済)
				,pIsVariation : false		//これはバリエーションか
				,pObjParent : null			//親ポーズののオブジェクト	※バリエーションの場合のみ設定

				//HTML情報
				,pElmScrollTarget : null	//順送りボタンによる移動のためのスクロール先
				,pElmFlatScrollTarget : null	//順送りボタンによる移動のためのスクロール先
				,pElmVariationArea : null		//HTML内のバリエーション格納エリア

				//名前によるグループ情報
				,pGroupInfo : null		//グループ情報
										//内容は、 makeNewGroup() を参照
				,pIsGrouped : false		//このメンバーがグループに入ったか

				//製作者情報
				,pCreatorInfo : objCreator
			}

		return objPose;
	}

	async function wrapMakeObjPose(argIndexNo,argPoseName,argCreatorUuid){
		let objPose = makeObjPose(argIndexNo,argPoseName,argCreatorUuid);

		g_nm2O[objPose.pName] = objPose;
		g_idx2O[objPose.pIndexNo] = objPose;
	}


	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
	//ポーズリスト（'|'区切り）を分割
	let poseListPsv = (argJsonData.poseList).split('|');
	let objUuidCache = new Object();

	for(let i=0,len=poseListPsv.length;i<len;i+=4){
		let psvIndex = poseListPsv[i];				//in worldのcontentsの連番（０～
		let psvName = unescape(poseListPsv[i+1]);	//ポーズ名
		let psvUuidNo = poseListPsv[i+2];			//製作者のUuid（番号）
		let psvUuid = poseListPsv[i+3];				//製作者のUuid

		if(psvUuid!=""){
			objUuidCache[psvUuidNo] = psvUuid;
		}else{
			psvUuid = objUuidCache[psvUuidNo];
		}

		if ( psvIndex in g_idx2O ){
			//ありえないが同じデータがきたらスキップ
			continue;
		}

		await wrapMakeObjPose(psvIndex,psvName,psvUuid);
		//let objPose = makeObjPose(psvIndex,psvName,psvUuid);

		//g_nm2O[objPose.pName] = objPose;
		//g_idx2O[objPose.pIndexNo] = objPose;

		++addPoseCount;
		updateProgress();
	}

	//追加したポーズ数を返す
	return addPoseCount;
}

//プログレスバー設定
function updateProgress(argTotalCounter=null){
	if(argTotalCounter!=null){
		g_progressValue = 0;
		g_progressBar.max = argTotalCounter;
		g_progressBar.value = g_progressValue;
	}else{
		++g_progressValue;
	}
	g_progressBar.value = g_progressValue;
}

//数値をゼロ詰め数に変換する
// 以下をバリエーションと認めないための対応
//			'66 #1'
//			'66 #10'
function cnvNum(argString){
	let splitArray = argString = argString.split(/(\d+)/);

	let joinString = '';
	for(let i in splitArray){
		let chkVal = splitArray[i];
		if(chkVal!=''){
			if(!isNaN(chkVal)){
				chkVal = ('00000000000000000000' + chkVal).substr(-20);
			}
			joinString += chkVal;
		}
	}
	return joinString;
}

//正規化した名前のリストを作成する
function makeNormalizationNameList(argTargetKeys){
	let objNormalizationName = new Object();
	let objNormalizationNameUniq = new Object();

	for(let oneName of argTargetKeys){

		let normalizationKey = cnvNum(g_nm2O[oneName].pNormalizationName);

		if(normalizationKey in objNormalizationNameUniq){
			//正規化の結果、重複が発生していたら
			//後ろに「タブ＋連番」を追加する
			++objNormalizationNameUniq[normalizationKey];
			normalizationKey = normalizationKey + '\t' + objNormalizationNameUniq[normalizationKey];
		}else{
			objNormalizationNameUniq[normalizationKey] = 0;
		}

		objNormalizationName[normalizationKey] = oneName;
	}
	return objNormalizationName;
}


//基本要素を作成する
function makeUI(){
	function makePartsLabel(argId,argClassTag,argText=null,argTitle=null){
		let objLabel = document.createElement('label');

		objLabel.htmlFor = argId;

		objLabel.className = 'csCmnLbl ' + argClassTag;

		if(argText!=null){
			//objLabel.appendChild(document.createTextNode(argText));
			//連続したスペースが反映されないため
			objLabel.innerHTML = argText.replace(' ','&nbsp;').replace('<','&lt;').replace('>','&gt;');
		}

		if(argTitle!=null){
			objLabel.title = argTitle;
		}

		return objLabel;
	}

	function makePartsPoseName(argObjPose,argWakuClassTag,argLabelClassTag,argIsFlat=false){
		//------------------------------
		//radioとラベルを囲む枠
		//------------------------------
		let objWaku = document.createElement('div');
		objWaku.className = argWakuClassTag;

		//------------------------------
		//アニメーション選択用のradioボタンとラベル
		//------------------------------
		let objRadio = document.createElement('input');
		objRadio.type = 'radio';
		objRadio.name = ((argIsFlat)?'namesPoseListFlat':'namesPoseList');
		objRadio.className = 'csPoseRdo';
		objRadio.id = 'rdo_' + ((argIsFlat)?'Flat':'') + argObjPose.pIndexNo;	//ラベルとの紐づけ用
		objRadio.custIndexNo = argObjPose.pIndexNo;
		objRadio.onchange = function(){sendCommand('CTRL',event.target.custIndexNo);}
		objWaku.appendChild(objRadio);

		let displayString = argObjPose.pDisplayName;
		if((argIsFlat)||(argObjPose.pIsVariation)){
			displayString = argObjPose.pName;
		}
		let objPoseLbl = makePartsLabel(objRadio.id,argLabelClassTag,displayString,argObjPose.pName + ' / creator : ' + argObjPose.pCreatorInfo.pName);
		objWaku.appendChild(objPoseLbl);

		if((!argIsFlat)&&(argObjPose.pIsParent)){
			//親である場合、バリエーション格納用のエリアを作成する

			//バリエーション表示用ボタン
			let objVarBtn = document.createElement('input');
			objVarBtn.type = 'checkbox';
			objVarBtn.checked = true;
			objVarBtn.name = 'btnVariationList';
			objVarBtn.id = 'chk_' + argObjPose.pIndexNo;	//ラベルとの紐づけとバリエーション枠との紐づけ
			objVarBtn.custId = 'waku_' + objVarBtn.id;
			objVarBtn.className = 'csVarBtn';
			objVarBtn.onchange = openCloseWaku;
			objPoseLbl.appendChild(objVarBtn);	//アニメーション名の後ろに追加

			objPoseLbl.appendChild(makePartsLabel(objVarBtn.id,'csVarBtnLbl'));

			//バリエーション格納用のフィールドを作成
			//※バリエーションはこれに追加していく
			let objVariationArea = objWaku.appendChild(document.createElement('div'));
			objVariationArea.id = objVarBtn.custId;
			objVariationArea.className = 'csVarDiv' + argObjPose.pGroupInfo.pLevel + ' ' + objVarBtn.id;
			argObjPose.pElmVariationArea = objVariationArea;
		}
		return objWaku;
	}

	function makeHigherGroup(argObjGroup,argIsHighGroup,addObjTarget){
		let outerCssTag = 'csGroupWaku';
		let outerLabelCssTag = 'csGroupLbl' + argObjGroup.pLevel;
		let outerId = argObjGroup.pGroupId;
		let innerId = argObjGroup.pGroupInnerId;
		let groupName = argObjGroup.pGroupName;
		let doAddGroupLabel = false;
		let cssTag = argObjGroup.pCssTag;
		if(argIsHighGroup){
			outerCssTag = 'csHigherGroupWaku';
			outerLabelCssTag = 'csHigherGroupLbl';
			outerId = argObjGroup.pHigherGroupId;
			innerId = argObjGroup.pHigherGroupInnerId;
			groupName = argObjGroup.pHigherGroupName;
			doAddGroupLabel = true;
			cssTag = argObjGroup.pHigherCssTag;
		}else{
			if(argObjGroup.pMemCount>1){
				doAddGroupLabel = true;
			}
		}

		//内部領域
		//以下を格納する
		//・下位グループ
		//・ポーズ名
		let objInnerWaku = document.getElementById(innerId);
		if(objInnerWaku==null){
			//未作成の場合だけ新規作成

			//グループ名を格納する
			let objOuterWaku = document.createElement('div');
			objOuterWaku.id = outerId;
			objOuterWaku.className = outerCssTag + ' ' + g_TagGroupTag + ' ' + cssTag;

			if(doAddGroupLabel){

				let objCheck = document.createElement('input');
				objCheck.type = 'checkbox';
				objCheck.name = 'btnGroupList';
				objCheck.className = 'csGroupChk';
				objCheck.id = 'chk_'+objOuterWaku.id;	//ラベルとの紐づけ用
				objCheck.custId = innerId;
				objCheck.onchange = openCloseWaku;
				objOuterWaku.appendChild(objCheck);

				objOuterWaku.appendChild(makePartsLabel(objCheck.id,'csGroupCmnLbl ' + outerLabelCssTag,groupName));
			}

			//グループ内の情報格納枠
			objInnerWaku = document.createElement('div');
			objInnerWaku.id = innerId;
			objOuterWaku.appendChild(objInnerWaku);

			addObjTarget.appendChild(objOuterWaku);
		}

		return objInnerWaku;
	}

	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/

	//==============================
	//リストボックスへの製作者情報の追加
	//==============================
	//製作者名でソート
	let nameList = new Object();
	let shopList = new Object();

	for(let oneUuid in g_uuid2O){
		let objCreator = g_uuid2O[oneUuid];
		let cssTag = '.' + objCreator.pCssTag;
		if(objCreator.pShopName!=null){
			if(objCreator.pShopName in shopList){
				shopList[objCreator.pShopName] += ',' + cssTag;
			}else{
				shopList[objCreator.pShopName] = cssTag;
			}
		}else{
			nameList[objCreator.pName] = cssTag;
		}
	}

	let parentElement = g_selCreator;

	let shopKeys = Object.keys(shopList);
	let nameKeys = Object.keys(nameList);

	if(shopKeys.length>0){
		shopKeys.sort(compareLowerCase);

		//Shopリスト
		if((nameKeys.length>0)){
			let optgroup = document.createElement('optgroup');
			optgroup.label = 'shop';
			g_selCreator.appendChild(optgroup);
			parentElement = optgroup;
		}

		for(let oneShopName of shopKeys){
			let cssTag = shopList[oneShopName];
			let opt = document.createElement('option');
			opt.text = oneShopName;
			opt.value = cssTag;
			parentElement.appendChild(opt);
		}

	}

	//製作者リスト
	if((nameKeys.length>0)&&(shopKeys.length>0)){
		optgroup = document.createElement('optgroup');
		optgroup.label = 'creator';
		g_selCreator.appendChild(optgroup);
		parentElement = optgroup;
	}
	nameKeys.sort(compareLowerCase);
	for(let oneCreatorName of nameKeys){
		let cssTag = nameList[oneCreatorName];
		let opt = document.createElement('option');
		opt.text = oneCreatorName;
		opt.value = cssTag;
		parentElement.appendChild(opt);
	}

	//==============================
	//フラットなポーズリストを作成する
	//==============================
	//※連携された順番（in worldのコンテンツの並び）
	for(let i in g_idx2O){
		let objPose = g_idx2O[i];

		let strClassName = 'csPoseLbl';
		let objWaku = makePartsPoseName(objPose,g_TagGroupTag + ' ' + objPose.pCreatorInfo.pCssTag,strClassName,true);
		objPose.pElmFlatScrollTarget = objWaku;
		g_poseFlatList.appendChild(objWaku);
	}
	//フラットなポーズリストを追加
	//※速度をあげるため、内部要素を追加しておいてから、リストそのものを追加する
	g_objMain.appendChild(g_poseFlatList);

	//==============================
	//Tree状のポーズリストを追加
	//※idで要素を参照するので、先に追加しないといけない
	//==============================
	g_objMain.appendChild(g_poseTreeList);

	//==============================
	//正規化した名前のソート
	//==============================
	//空白の数などで並びが変わってしまうため
	let normalKeys = Object.keys(g_objNormalizationNameList);
	normalKeys.sort(compareLowerCase);

	//------------------------------
	//グループ枠を先に作成する
	//------------------------------
	//システムグループが存在する場合、先に作成する
	for(let systemGroup in g_systemGroupList){
		let oneGroup = g_systemGroupList[systemGroup];
		if(oneGroup!=null){
			makeHigherGroup(oneGroup,true,g_poseTreeList);
		}
	}
	//通常のグループ枠を作成する
	//※ソート順：上位グループのソート順ではなく
	//				下位グループのソート順に処理を行う
	//				（グループは長さが短くなるので、フルネームと異なる可能性があるため）
	for(let groupName in g_groupNames){
		let oneGroup = g_groupNames[groupName];

		let objHigherIn = null;
		if(oneGroup.pHigherGroupName!=null){
			//上位グループがある場合、上位グループを先に作成する
			objHigherIn = makeHigherGroup(oneGroup,true,g_poseTreeList);
		}

		//通常のグループを作成する
		let addTarget = (objHigherIn == null)?g_poseTreeList:objHigherIn;
		makeHigherGroup(oneGroup,false,addTarget);
	}

	//ポーズリストを作成する
	for(let oneNormalName of normalKeys){
		let oneName = g_objNormalizationNameList[oneNormalName];
		let objPose = g_nm2O[oneName];

		if(objPose.pIsVariation){
			//バリエーションは対象外
			continue;
		}
		if(objPose.pGroupInfo == null){
			//保険
			continue;
		}
		//------------------------------
		//radioとラベルを囲む枠
		//------------------------------
		//console.log(objPose.pName);
		let strGroupLbl = (objPose.pGroupInfo.pMemCount==1)?'csNoGroupLbl' + objPose.pGroupInfo.pLevel:'csInGroupLbl'
		let strClassName = 'csPoseLbl '+ strGroupLbl;
		let objWaku = makePartsPoseName(objPose,g_TagGroupTag + ' ' + objPose.pCreatorInfo.pCssTag,strClassName);
		objPose.pElmScrollTarget = objWaku;

		if(objPose.pIsParent){
			//親である場合

			let objVariationNameList = objPose.pVariationNameList;
			if(objVariationNameList!=null){
				//バリエーションを列挙する
				let objVariationArea = objPose.pElmVariationArea;
				for(let variationKey of objVariationNameList){
					let objPoseVariation = g_nm2O[variationKey];

					//------------------------------
					//radioとラベルを囲む枠
					//------------------------------
					let objVariationWaku = makePartsPoseName(objPoseVariation,'csVarOne','csVarLbl');

					objPoseVariation.pElmScrollTarget = objVariationWaku;

					//親のバリエーション格納用フィールドに入れる
					objVariationArea.appendChild(objVariationWaku);
				}
			}
		}

		let objInnerWaku = document.getElementById(objPose.pGroupInfo.pGroupInnerId);
		objInnerWaku.appendChild(objWaku);
	}

	g_namesPoses = document.getElementsByName('namesPoseList');
	g_namesPosesFlat = document.getElementsByName('namesPoseListFlat');

	//チェック状態に応じて初期状態にする
	openCloseWaku('btnGroup',false);
	openCloseWaku('btnVariation',false);

	addStyleElement('cssDisplayMain','#idMessage{display:none;}');

	setFieldset(false);

	//画面のリサイズはかからない前提
	g_scrollHeight = document.documentElement.clientHeight - g_poseTreeList.offsetTop;
	let divHeight = g_scrollHeight + 'px';
	g_poseTreeList.style.height = divHeight;
	g_poseFlatList.style.height = divHeight;

	changeDisplayMode();

	changeSayMode();
	sendCommand('READY');
}

//==============================
//バリエーション判定
//==============================
//以下のようなバリエーションを判定する
//sortの昇順/降順でチェックするため
//判定対象が少なくなるグループ内で処理を行う
//以下のパターンに対応
//パターン①
//	'Lyrium. Alice Breathing Animation 1 CURVY P3'
//	'Lyrium. Alice Breathing Animation 1 CURVY P4'
//	'Lyrium. Alice Breathing Animation 1 P3'
//	'Lyrium. Alice Breathing Animation 1 P4'
//		↓
//	'Lyrium. Alice Breathing Animation 1 P3'
//	┗'Lyrium. Alice Breathing Animation 1 CURVY P3'
//	'Lyrium. Alice Breathing Animation 1 P4'
//	┗'Lyrium. Alice Breathing Animation 1 CURVY P4'
//
//パターン②
//	'mirinae: asami 1 animation'
//	'mirinae: asami 1 m animation'
//		↓
//	'mirinae: asami 1 animation'
//	┗'mirinae: asami 1 m animation'
//
//パターン③ SAPA対応
//
//	数値A.数値B.数値Cの場合数値Cはバリエーション扱いする
//
function makeVariationSub(argPoseKeyList,argPoseNameList){
	const isPriorityRegExp = /^(.*)\b((?:P|Prio|Priority|V|Version)[ _=\-]*\d)$/i;	//優先度っぽいか
	const isPriorityQuatRegExp = /^(.*)\b([\(\[]*(?:P|Prio|Priority|V|Version)[ _=\-]*\d[/)/]]*)$/i;	//優先度っぽいか
	const regExpArray = Array(isPriorityRegExp,isPriorityQuatRegExp);
	const wordSeparatorRegExp = /([^a-z_])/i;				//単語と判断して区切らない文字列

	function setVariarion(argObjVariation,argObjParent){
		let objPoseParent = argObjParent;

		if(objPoseParent.pIsVariation){
			//親に指定しようとしているものがバリエーションだった場合

			//親の親を取得
			argObjParent = objPoseParent.pObjParent;

		}else{
			//親側の設定
			objPoseParent.pIsParent = true;
		}
		//バリエーション側の設定
		argObjVariation.pIsParent = false;		//すでに親認定されている場合もあるので解除
		argObjVariation.pIsVariation = true;
		argObjVariation.pObjParent = argObjParent;

		//親にバリエーションの情報を設定する
		objPoseParent = argObjParent;
		if(objPoseParent.pVariationNameList==null){
			objPoseParent.pVariationNameList = new Object();
		}
		objPoseParent.pVariationNameList[argObjVariation.pName] = null;
	}

	//------------------------------
	//単語レベルに分解してバリエーション判定を行う
	//------------------------------
	function makeVariationByWord(argObjPoseBase,argObjPoseTarget){
		let poseNameBase   = argObjPoseBase.pNormalizationName;
		let poseNameTarget = argObjPoseTarget.pNormalizationName;

		//単語単位に区切る
		let arrayBase   = poseNameBase.split(wordSeparatorRegExp);
		let arrayTarget = poseNameTarget.split(wordSeparatorRegExp);

		let lenBase = arrayBase.length;
		let lenTarget = arrayTarget.length;

		let maxLen = Math.min(lenBase,lenTarget);

		let matchCount = 0;	//一致した項目数
		//先頭方向から不一致の単語にあたるまで処理を行う
		for(let i=0;i<maxLen;++i){
			if(arrayTarget[i]==arrayBase[i]){
				++matchCount;
			}else{
				break;
			}
		}
		if(matchCount == 0){
			//ひとつも一致しなければ抜ける
			return;
		}

		//一致した項目は削除
		arrayTarget.splice(0,matchCount);
		arrayBase.splice(0,matchCount);

		//配列の終端から先頭方向へ不一致の単語にあたるまで処理を行う
		lenBase -= matchCount;
		lenTarget -= matchCount;
		if((maxLen = Math.min(lenBase,lenTarget))>0){
			let lastIndexBase = lenBase -1;
			let lastIndexName = lenTarget -1;
			for(let i=0;i<maxLen;++i){
				if(arrayTarget[lastIndexName]==arrayBase[lastIndexBase]){
					//一致した要素は削除
					arrayTarget.splice(lastIndexName, 1);
					arrayBase.splice(lastIndexBase, 1);
				}else{
					break;
				}
				--lastIndexName;
				--lastIndexBase;
			}
		}

		//残った単語を全てつなげる
		let joinBase = arrayBase.join('');
		let joinTarget = arrayTarget.join('');

		if((joinTarget != '')&&(joinBase != '')){
			//どちらにも文字が残っていたら
			return;
		}

		let diffstr = ((joinBase!='')?joinBase:joinTarget).trim();

		if(diffstr.substr(0,1).match(g_allNumericRegExp)){
			//１桁目が数字なら抜ける
			return;
		}

		let objPoseVariation = argObjPoseTarget;
		let objParent = argObjPoseBase;

		if(poseNameBase.length > poseNameTarget.length){
			objPoseVariation = argObjPoseBase;
			objParent = argObjPoseTarget;
		}
		setVariarion(objPoseVariation,objParent);
	}

	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/

	let bak2Keta = null;
	let objTargetList = null;
	for(let onePoseNameBaseKey of argPoseKeyList){
		let onePoseNameBase = argPoseNameList[onePoseNameBaseKey];
		let objPoseBase = g_nm2O[onePoseNameBase];
		let poseNameBase = objPoseBase.pNormalizationName;
		let isWordsA = poseNameBase.match(wordSeparatorRegExp);
		let base2keta = poseNameBase.substr(0,g_sameLimitLength);

		objTargetList = new Object();;
		let isfound = false;
		for(let onePoseNameKey of argPoseKeyList){
			let onePoseName = argPoseNameList[onePoseNameKey];
			let objPoseTarget = g_nm2O[onePoseName];
			let poseNameTarget = objPoseTarget.pNormalizationName;

			if(base2keta!=poseNameTarget.substr(0,g_sameLimitLength)){
				//先頭２桁が異なる場合は、処理しない
				if(! isfound){
					//未一致の場合は、見つかるまでループを抜けない
					continue;
				}else{
					//すでに一致した後の不一致の場合はループを抜ける
					break;
				}
			}else{
				isfound = true;

				let doSet  = true;
				//同一グループのものだけを対象にする
				let objPose = objPoseTarget;
				if((objPoseBase.pGroupInfo!=null)&&(objPose.pGroupInfo!=null)){
					if(objPoseBase.pGroupInfo.pGroupName != objPose.pGroupInfo.pGroupName){
						doSet = false;
					}
				}
				if(doSet){
					objTargetList[onePoseNameKey] = onePoseName;
				}

			}
		}
		bak2Keta = base2keta;

		for(let onePoseNameKey in objTargetList){
			let onePoseName = objTargetList[onePoseNameKey];
			let objPoseTarget = g_nm2O[onePoseName];
			let poseNameTarget = objPoseTarget.pNormalizationName;
			if(poseNameBase==poseNameTarget){
				//比較元と比較先が完全一致する時は、処理しない
				continue;
			}

			let objPose = objPoseTarget;

			if(poseNameTarget.startsWith(poseNameBase)){
				//ポーズ②の名前がポーズ①の名前から始まる
				//	①'aaaaaa'
				//	②'aaaaaaM'
				//	上記の場合、②は①のバリエーションと判断する

				let diffstr = (poseNameTarget.slice(poseNameBase.length)).trim();
				if(!diffstr.substr(0,1).match(g_allNumericRegExp)){
					setVariarion(objPose,objPoseBase);
				}
			}else {
				//SAPA対応
				if((poseNameBase.match(/^\d+\.\d+\.\d+/))&&(poseNameTarget.match(/^\d+\.\d+\.\d+/))){
					if(!objPoseBase.pIsVariation){
						//SAPAチェックの場合、一度バリエーションとなった場合は再チェックしない
						let sameBase	= poseNameBase.replace(/^(\d+\.\d+)(\..*)$/,'$1');
						let sameTarget	= poseNameTarget.replace(/^(\d+\.\d+)(\..*)$/,'$1');
						if(sameBase==sameTarget){
							setVariarion(objPose,objPoseBase);
							continue;
						}
					}
				}

				let isPriority = false;

				for(let i in regExpArray){
					let regExpPattern = regExpArray[i];
					if(poseNameBase.match(regExpPattern) && poseNameTarget.match(regExpPattern)){
						//優先度っぽい感じなら
						//優先度文字列を抜くと一致するかチェック
						let substredBase  = poseNameBase.replace(regExpPattern,'$1');
						let substredTarget= poseNameTarget.replace(regExpPattern,'$1');
						if(substredBase == substredTarget){
							let priorityBase  = poseNameBase.replace(regExpPattern,'$2');
							let priorityTarget= poseNameTarget.replace(regExpPattern,'$2');
							if(priorityBase<priorityTarget){
								//console.log('Priority:['+priorityBase+']['+poseNameBase+']['+priorityTarget+']['+poseNameTarget+']');
								setVariarion(objPose,objPoseBase);
								isPriority = true;
								break;
							}else{
								//次の機会に処理されるだろう
							}
						}
					}
				}

				if(! isPriority){
					if((isWordsA)&&(poseNameTarget.match(wordSeparatorRegExp))){
						//単語レベルに分割できる場合
						//------------------------------
						//単語レベルに分解してバリエーション判定を行う
						//------------------------------
						makeVariationByWord(objPoseBase,objPose);
					}
				}
			}
		}
	}
}

//以下のパターンをバリエーションと認識できるようにする
//	'Bea Pose 1 Breathing'
//	'Bea Pose 1M Breathing'
function makeVariationInfo(){
	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/

	//製作者別に分ける
	let objCreatorPoseList = new Object();
	for(let i in g_idx2O){
		let objPose = g_idx2O[i];
		let creatorUuid = objPose.pUuid;

		if( ! ( creatorUuid in objCreatorPoseList ) ){
			objCreatorPoseList[creatorUuid] = new Object();
		}
		let objCreatorPose = objCreatorPoseList[creatorUuid];
		//let keyVal = objPose.pName;
		let keyVal = cnvNum(objPose.pName);
		objCreatorPose[keyVal] = objPose.pName;
	}

	//------------------------------
	//バリエーション設定
	//------------------------------
	//製作者単位で処理を行う
	for(let oneName in objCreatorPoseList){
		let poseList = objCreatorPoseList[oneName];
		let poseKeys = Object.keys(poseList);
		poseKeys.sort();

		makeVariationSub(poseKeys,poseList);
	}

	//------------------------------
	//pVariationNameListをソート
	//------------------------------
	for(let i in g_idx2O){
		let objPose = g_idx2O[i];
		if(objPose.pIsParent){
			let poseList = objPose.pVariationNameList;
			let poseKeys = Object.keys(poseList);
			poseKeys.sort(compareLowerCase);

			objPose.pVariationNameList = poseKeys;
			//console.log('parent['+objPose.pName+']'+objPose.pVariationNameList);
		}
	}
}

//名前でグループ化する
function groupingByName(){
	//グループ化の際に文字列を区切る
	const wordSeparatorForGroupRegExp = /(\W)/;

	let objGroup = new Object();

	//	argTargetStringがargBaseStringに文字を足したものか判定
	//	上記の条件を満たしていても、以下のどちらかを満たしていない場合、falseとする
	//	・追加した文字列長が2文字以上であること
	//	・追加した文字列の先頭が数値であること
	function myStartsWith(argTargetString,argBaseString){
		let returnValue = false;
		if(!argTargetString.startsWith(argBaseString)){
			//基本の名前から始まっていない場合は即、終了
			return returnValue;
		}

		if(argBaseString.length + g_sameLimitLength >= argTargetString.length){
			//差異のある文字数が規定数以下であれば、一致と判断する
			returnValue = true;
		}
		//差異部分の抜き出し
		let diffString = (argTargetString.slice(argBaseString.length)).trim();
		//差異部分の先頭の英数字以外を抜き出す
		diffString = diffString.replace(/^[^a-z0-9]+/i,'');
		if(diffString.substr(0,1).match(g_allNumericRegExp)){
			//差異の１文字目が数字であればOK
			returnValue = true;
		}

		return returnValue;
	}

	function makeNewGroup(argPoseList=null){
		if(argPoseList==null){
			argPoseList = new Object();
		}

		return {
			//ポーズ名リスト
			 pPoseList : argPoseList

			//------------------------------
			//↓は処理の終盤で設定
			//------------------------------
			//グループ内の製作者を指すcssTagを設定
			,pGroupName : null
			,pCssTag : null
			,pGroupId :null
			,pGroupInnerId : null
			,pMemCount:0

			,pLevel	: 1	//1:最上位 2～サブグループ	※0始まりでもいいが、別で使うかもしれぬので
			,pHigherGroupName:null
			,pHigherGroupId:null
			,pHigherGroupInnerId:null
			,pHigherCssTag:null
			};
	}

	//グループ情報を移動する
	function fullNameMove(argObjGroup,argGroupNameTo,argGroupNameFrom,argIsMove,argPoseList){
		let objFromPoseList = argPoseList;
		if(argGroupNameFrom!=null){
			if(argGroupNameFrom==argGroupNameTo){
				//移動前後のグループが同じなら処理しない
				return;
			}
			objFromPoseList = argObjGroup[argGroupNameFrom].pPoseList;
		}

		let objToPoseList = argObjGroup[argGroupNameTo].pPoseList;
		for(let oneKey in objFromPoseList){
			objToPoseList[oneKey] = objFromPoseList[oneKey];
			delete objFromPoseList[oneKey];
		}
		if(argIsMove){
			//処理済情報は削除する
			delete argObjGroup[argGroupNameFrom];
		}
	}

	//語を区切る
	function separateSnakeCamel(argString,argWordSeparator=wordSeparatorForGroupRegExp){
		function isNotEmptyItem(element) {
			if ( element === '' || element === undefined ) {
				return false;
			}
			return true;
		}

		let objReturn = {
				 pIsWord:false
				,pArrayWords:[argString]	//配列として設定
			}

		let isSeparateWord = null;
		if(argString.match(wordSeparatorForGroupRegExp)){
			isSeparateWord = true;
			//通常の単語区切り
			objReturn.pIsWord = true;
			objReturn.pArrayWords = argString.split(wordSeparatorForGroupRegExp);
		}else if((argString.match(/[a-z]/))&&(argString.match(/[A-Z]/))){
			isSeparateWord = false;
			objReturn.pIsWord = true;
			objReturn.pArrayWords = argString.split(/(^[a-z]+)|([A-Z][a-z]+)/).filter( isNotEmptyItem );
			//JavaScriptでキャメルケースを単語に分割
			//https://easyramble.com/split-camelcase-word-with-javascript.html
		}

		if(objReturn.pIsWord){
			//定冠詞を分離させない
			if(objReturn.pArrayWords[0].match(/^(The|la|le)$/i)){
				let len = objReturn.pArrayWords.length;
				let lenShrink = 0;
				if(isSeparateWord){
					if(len>=2){
						lenShrink = 2;
					}
				}else{
					if(len>=1){
						lenShrink = 1;
					}
				}
				//console.log('A:['+objReturn.pArrayWords+']');
				if(lenShrink>0){
					objReturn.pArrayWords[0] = objReturn.pArrayWords.slice(0,lenShrink+1).join('');
					objReturn.pArrayWords.splice(1,lenShrink);
				}
				//console.log('B:['+objReturn.pArrayWords+']');
			}
		}

		return objReturn;
	}

	//２つの文字列の比較
	//	一致しなければnull
	//	一致する箇所があれば、一致部分のみを返す
	function compareName(argPoseA,argPoseB,argIsMarume=false,argWordSeparator=wordSeparatorForGroupRegExp){
		if(argPoseA==argPoseB){
			return argPoseA;	//２つの文字列は絶対異なるが念のため
		}
		let retString = '';
		let sameLen = 0;

		let isWordSeparate = false;

		let isSAPA = false;
		if(argPoseA.match(g_allNumericRegExp) && argPoseB.match(g_allNumericRegExp)){
			//数値要素だけの文字列で
			//単語区切りができそうなら、単語区切りで比較する。
			//※以下を別のグループと認識できるようにするため
			//	'151.1'
			//	'159.1.1'
			isSAPA = true;
		}

		let objSeparateA = separateSnakeCamel(argPoseA,argWordSeparator);
		let objSeparateB = separateSnakeCamel(argPoseB,argWordSeparator);

		let isWordA = objSeparateA.pIsWord;
		let isWordB = objSeparateB.pIsWord;

		if(isSAPA || (isWordA && isWordB)){
			isWordSeparate = true;
			let arrayA = objSeparateA.pArrayWords;
			let arrayB = objSeparateB.pArrayWords;

			let maxLen = Math.min(arrayA.length,arrayB.length);
			for(let i=0;i<maxLen;++i){
				let wordA = arrayA[i];
				let wordB = arrayB[i];
				if(wordA == wordB){
					//一致する最長の長さを設定
					retString += wordA;
					sameLen = retString.length;
				}else{
					break;
				}
			}
		}

		if(! isWordSeparate){
			//２つの文字列の共通部分を取得する
			let maxLen = Math.min(argPoseA.length,argPoseB.length);
			for(let len=g_sameLimitLength;len<=maxLen;++len){
				let poseA = argPoseA.substr(0,len);
				if(poseA == argPoseB.substr(0,len)){
					//一致する最長の長さを設定
					sameLen = len;
					retString = poseA;
//				}else if((poseA.match(/[^a-z0-9]/i)) && (argPoseB.match(/[^a-z0-9]/i))){
//					//todo:考慮の余地あり
//
//					//両方が区切り文字なら一致とみなす
//					sameLen = len;
//					retString = poseA;

				}else{
					break;
				}
			}
		}

		if((argIsMarume)&&(sameLen>0)){
			const objRegExp = /[^a-z]+/i
			//差異部分の比較
			//※差異部分が無視してもよい文字列の場合、同一視する
			let diffA = (argPoseA.substr(sameLen)).replace(objRegExp,'');
			let diffB = (argPoseB.substr(sameLen)).replace(objRegExp,'');
			if((diffA!='')||(diffB!='')){
				return null;
			}
		}

		//小細工
		//console.log(retString);
		let refStringModify = retString;
		if(refStringModify.match(/^(.*[a-z0-9])[^a-z0-9]+$/i)){
			//最後に区切り文字がくるのを許さない
			refStringModify = refStringModify.replace(/^(.*[a-z0-9])[^a-z0-9]+$/i,'$1');
			//console.log('retString['+retString+']->A:'+refStringModify);
		}else if(refStringModify.match(/^(.*[a-z0-9])[^a-z0-9]+[a-z0-9]$/i)){
			//最後が「区切り文字＋１文字」を許さない
			refStringModify = refStringModify.replace(/^(.*[a-z0-9])[^a-z0-9]+[a-z0-9]$/i,'$1');
			//console.log('retString['+retString+']->B:'+refStringModify);
		}
		if(refStringModify.length>=g_sameLimitLength){
			//小細工の後、既定の文字数を割るのは許さない
			retString = refStringModify;
		}

		return (retString=='')?null:retString;
	}

	//単語と判断して区切らない文字列
	//英数字のみを単語とする
	//※\Wと違って、アンダーバーも区切り文字と判断する
	const wordSeparator02RegExp = /([^a-z0-9])/i;
	//２つの文字列の共通部分を抜き出す
	//単語単位で文字の先頭から一致する部分を抜き出す
	function makeMergeWord(argArrayGroupName01,argArrayGroupName02){
		let len01 = argArrayGroupName01.length;
		let len02 = argArrayGroupName02.length;

		let maxLen = Math.min(len01,len02);

		let matchCount = 0;	//一致した項目数
		//先頭方向から不一致の単語にあたるまで処理を行う
		for(let i=0;i<maxLen;++i){
			if(argArrayGroupName01[i]==argArrayGroupName02[i]){
				++matchCount;
			}else{
				break;
			}
		}
		if(matchCount == 0){
			//ひとつも一致しなければ抜ける
			return null;
		}

		let arrayMerge = argArrayGroupName01.slice(0,matchCount);
		for(i=arrayMerge.length-1;i>=0;--i){
			if(arrayMerge[i].match(wordSeparator02RegExp)){
				//終端が区切り文字なら削除する
				arrayMerge.splice(i,1);
			}else{
				break;
			}
		}
		if(arrayMerge.length<=0){
			return null;
		}

		//一致した部分を接続して返す。
		return arrayMerge.join('');
	}

	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
	//==============================
	//上の行・下の行での比較を行う。
	//==============================
	LabelComparePose: {
		console.log('LabelComparePose');
		//グループ名候補リストを作成
		let objGroupNameCandidateList = new Object();

		//空白の数などで並びが変わってしまうため
		//正規化した名前で処理する
		let normalKeys = Object.keys(g_objNormalizationNameList);
		normalKeys.sort();

		let objPosePre = null;
		for(let oneNormalName of normalKeys){
			let oneName = g_objNormalizationNameList[oneNormalName];
			let objPose = g_nm2O[oneName];

			//比較用にポーズ名を加工する
			let compName = objPose.pModifyForCompare;
			//console.log('compName)'+compName);

			if(objPosePre!=null){
				//比較用にポーズ名を加工する
				let compNamePre = objPosePre.pModifyForCompare;

				let groupName = compareName(compNamePre,compName,false);
				if(groupName!=null){
					groupName = groupName.trimEnd();
					if(!(groupName in objGroupNameCandidateList)){
						objGroupNameCandidateList[groupName] = null;
						//console.log('groupName)'+groupName);
					}
				}
			}
			objPosePre = objPose;
		}

		//候補を降順に並び替える（基本的に文字列長が長い順に処理したい）
		let candidateKeys = Object.keys(objGroupNameCandidateList);
		candidateKeys.sort(compareLowerCaseRev);

		//厳密なグループ化
		//※myStartsWithを利用
		for(let oneCandidate of candidateKeys){
			for(let oneNormalName of normalKeys){
				let oneName = g_objNormalizationNameList[oneNormalName];
				let objPose = g_nm2O[oneName];
				if(objPose.pIsGrouped){
					continue;
				}

				let compName = objPose.pModifyForCompare;

				if(myStartsWith(compName,oneCandidate)){
					objPose.pIsGrouped = true;

					let objPoseList = new Object();
					objPoseList[oneName] = objPose.pName;

					//グループに属するファイルが存在する場合のみ処理を行う。
					if(!(oneCandidate in objGroup)){
						objGroup[oneCandidate] = makeNewGroup(objPoseList);
					}else{
						//既存であれば、ファイルリストをコピーする
						fullNameMove(objGroup,oneCandidate,null,false,objPoseList);
					}
				}
			}
		}
		//↑↓のループはまとめないこと
		//単純なグループ化
		//※～.startsWithを利用
		for(let oneCandidate of candidateKeys){
			for(let oneNormalName of normalKeys){
				let oneName = g_objNormalizationNameList[oneNormalName];
				let objPose = g_nm2O[oneName];
				if(objPose.pIsGrouped){
					continue;
				}

				let compName = objPose.pModifyForCompare;

				if(compName.startsWith(oneCandidate)){
					objPose.pIsGrouped = true;

					let objPoseList = new Object();
					objPoseList[oneName] = objPose.pName;

					//グループに属するファイルが存在する場合のみ処理を行う。
					if(!(oneCandidate in objGroup)){
						objGroup[oneCandidate] = makeNewGroup(objPoseList);
					}else{
						//既存であれば、ファイルリストをコピーする
						fullNameMove(objGroup,oneCandidate,null,false,objPoseList);
					}
				}
			}
		}
	}

	//==============================
	//グループ化されなかったものを追加
	//==============================
	LabelAddUngroupPoses:	{
		console.log('LabelAddUngroupPoses');
		for(let i in g_idx2O){
			let objPose = g_idx2O[i];

			if(objPose.pIsGrouped){
				continue;
			}
			objPose.pIsGrouped = true;
			let poseName = objPose.pName;
			let groupName = objPose.pNormalizationName;
			//console.log('poseName['+poseName+']');
			let oneGroup = (objGroup[groupName] = makeNewGroup(null));
			oneGroup.pPoseList[poseName] = poseName;
		}
	}

	//==============================
	//グループ名の正規化
	//==============================
	LabelNormalizationGroup:	{
		console.log('LabelNormalizationGroup');
		for(let oneGroupName in objGroup){
			//末尾の不要な文字列を削除する
			let newGroupName = oneGroupName.replace(g_delLastNumericRegExp,'$1');

			if(!(newGroupName in objGroup)){
				//console.log('newGroupName:['+newGroupName+']'+oneGroupName);
				objGroup[newGroupName] = makeNewGroup(null);
				fullNameMove(objGroup,newGroupName,oneGroupName,true);
			}
		}
	}

	//==============================
	//まとめられるグループの対応①
	//==============================
	LabelTogetherGroup01:	{
		console.log('LabelTogetherGroup01');
		let groupKeys = Object.keys(objGroup);
		//	まるめ後の比較
		//	末尾数字の差異などは、同じグループと判断する
		groupKeys.sort();

		let groupNamePre = null;
		for(let groupName of groupKeys){
			if(groupNamePre!=null){
				let mergeGroupName = compareName(groupNamePre,groupName,true);
				if(mergeGroupName!=null){
					//グループの統合を行う
					//グループに属するファイルが存在する場合
					if(!(mergeGroupName in objGroup)){
						objGroup[mergeGroupName] = makeNewGroup(null);
					}
					//mergeGroupNameに情報を移動する
					fullNameMove(objGroup,mergeGroupName,groupNamePre,true);
					fullNameMove(objGroup,mergeGroupName,groupName,true);

					groupNamePre = mergeGroupName;
					//console.log('merge mergeGroupName:['+mergeGroupName+']groupName:['+groupName+']');
				}else{
					//console.log('none groupNamePre:['+groupNamePre+']groupName:['+groupName+']');
					groupNamePre = groupName;
				}
			}else{
				//console.log('first groupNamePre:['+groupNamePre+']groupName:['+groupName+']');
				groupNamePre = groupName;
			}
		}
	}

	//==============================
	//まとめられるグループの対応②
	//==============================
	LabelTogetherGroup02:	{
		console.log('LabelTogetherGroup02');
		//今のグループ名に、前のグループ名が含まれている場合
		//前のグループに統合する
		let groupKeys = Object.keys(objGroup);
		groupKeys.sort();

		let groupNamePre = null;
		for(let groupName of groupKeys){
			if(groupNamePre!=null){
				if(myStartsWith(groupName,groupNamePre)){
					//console.log('merge groupNamePre:['+groupNamePre+']groupName:['+groupName+']');

					fullNameMove(objGroup,groupNamePre,groupName,true);

					groupName = groupNamePre;
				}else{
					//console.log('none2 groupNamePre:['+groupNamePre+']groupName:['+groupName+']');
				}
			}
			groupNamePre = groupName;
		}
	}

	//==============================
	//上位のグループ情報を作成する
	//==============================
	let objHigherGroupName = new Object();

	//todo:お店で分けられるものをグループ化する
	for(let oneUuid in g_shopInfo){
		objShop = g_shopInfo[oneUuid];
					//pShopName
	}

	//グループ名の共通部分をチェックする
	//グループ情報を作成
	//大文字・小文字を区別せずソートした順に処理を行う
	LabelMakeHigherGroup: {
		console.log('LabelMakeHigherGroup');
		let groupKeys = Object.keys(objGroup);
		groupKeys.sort(compareLowerCase);

		let higherGroupSeq = 0;
		let higerGroupNameList = null;

		//グループ名の共通部分をまとめる
		//	二段階で処理する
		//	LabelMakeHigherGroup01：グループ名の中から共通する名前を探す
		//	LabelMakeHigherGroup02：↑で作成したグループ名の中からさらに共通する名前を探す
		LabelMakeHigherGroup01:{
			let newGroupList = new Object();

			let groupNamePre = null;
			for(let groupName of groupKeys){
				let sameName = null;
				if(groupName.match(/^\d./)){
					//１桁目が数字の場合、数字グループを作成する
					sameName = g_numericGroupName;
				}else{
					if(groupNamePre != null){

						let objSeparate01	= separateSnakeCamel(groupNamePre,wordSeparator02RegExp);
						let objSeparate02	= separateSnakeCamel(groupName,wordSeparator02RegExp);

						let isWords01 = objSeparate01.pIsWord;
						let isWords02 = objSeparate02.pIsWord;

//						if(isWords02 == isWords01){
//							if(isWords02){
								//両方単語の場合
//								sameName = makeMergeWord(objSeparate01.pArrayWords,objSeparate02.pArrayWords);
								//console.log(isWords02+':'+isWords01+')sameName['+sameName+']groupNamePre['+groupNamePre+']groupName['+groupName+']');
//							}else{
								//両方単語でない場合

//								sameName = compareName(groupNamePre,groupName,false);
								sameName = compareName(groupNamePre,groupName,false,wordSeparator02RegExp);
								if(sameName!=null){
									sameName = sameName.replace(g_delLastNumericRegExp,'$1');
								}
								//console.log(isWords02+':'+isWords01+')sameName['+sameName+']groupNamePre['+groupNamePre+']groupName['+groupName+']');
//							}
//						}
					}
				}
				if(sameName!=null){
					if(!(sameName in newGroupList)){
						//上位グループ名と連番を採番
						newGroupList[sameName] = higherGroupSeq++;
					}
				}

				groupNamePre = groupName;
			}
			let groupListLen = Object.keys(newGroupList).length;
			if(groupListLen>0){
				higerGroupNameList = newGroupList;
			}
		}

		/*↓の処理がいまいち*/
		LabelMakeHigherGroup02:{
			let srcGroupList = higerGroupNameList;

			//バックアップする
			let newGroupList = new Object();
			for (let baseName in srcGroupList){
				if(baseName.match(/^\d./)){
					continue;
				}
				newGroupList[baseName] = srcGroupList[baseName];
			}

			for (let baseName in srcGroupList){
				if(baseName.match(/^\d./)){
					continue;
				}
				for (let targetName in srcGroupList){
					if(baseName!=targetName){

						let mergeName = compareName(baseName,targetName,false);
						if(mergeName!=null){
							if(baseName in newGroupList){
								delete newGroupList[baseName];
							}
							if(targetName in newGroupList){
								delete newGroupList[targetName];
							}

							if(!(mergeName in newGroupList)){
								//上位グループ名と連番を採番
								newGroupList[mergeName] = higherGroupSeq++;
							}
						}
					}
				}
			}
			let groupListLen = Object.keys(newGroupList).length;
			if(groupListLen>0){
				higerGroupNameList = newGroupList;
			}
		}

		if(higerGroupNameList != null){
			//上位グループができた場合のみ処理

			//全てのグループに、属している上位グループの情報を設定する
			//※できるだけ長い名前に一致するように降順で処理する
			let higherCandidateKeys = Object.keys(higerGroupNameList);
			higherCandidateKeys.sort(compareLowerCaseRev);
			//higherCandidateKeys.sort(compareLowerCase);

			for(let higherGroupName of higherCandidateKeys){
				let higherGroupId = 'idHigerGroup' + higerGroupNameList[higherGroupName];

				//全ての上位グループ名に対して処理を行う
				for(let groupName of groupKeys){
					let oneGroup = objGroup[groupName];

					if(oneGroup.pHigherGroupName!=null){
						//すでに上位が決まっている場合は、処理しない
						continue;
					}

					let doSet = false;
					if(higherGroupName == g_numericGroupName){
						//数値グループの場合
						if(groupName.match(/^\d/)){
							//グループ名が数字から始まっている場合
							doSet = true;
						}
					}else if(groupName.startsWith(higherGroupName)){
						//グループ名が上位グループに属している場合
						doSet = true;
					}

					if(doSet){
						//console.log('  set higherGroupName['+higherGroupName+']groupName['+groupName+']');
						if(higherGroupName in g_systemGroupList){
							//システムグループの場合
							if(g_systemGroupList[higherGroupName]==null){
								//最初に検出したグループ情報を設定する
								g_systemGroupList[higherGroupName] = oneGroup;
							}
						}

						oneGroup.pHigherGroupId = higherGroupId;
						oneGroup.pHigherGroupInnerId = 'list' + higherGroupId;
						oneGroup.pHigherGroupName = higherGroupName;
						oneGroup.pLevel ++;

						//上位グループに属するポーズ名のリストを作成する
						if(!(higherGroupName in objHigherGroupName)){
							objHigherGroupName[higherGroupName] = new Object();
						}
						let objPoseListInHigherGroupName = objHigherGroupName[higherGroupName];
						let onePoseList = oneGroup.pPoseList;
						for(let oneFile in onePoseList){
							objPoseListInHigherGroupName[oneFile] = oneFile;
						}
					}else{
						//console.log('noset higherGroupName['+higherGroupName+']groupName['+groupName+']');
					}
				}
			}

			//todo:上位グループ配下の場合
			//複数グループがある場合に限り
			//単語単位の共通部分を削除してpDisplayNameを設定する
			//  'CHICQRO: Erotic Dreams - Bento Pose Pack 01 - Pose'
			//  'CHICQRO: Submissive Female - Bento Pose Pack 01 - Pose'
			//	↓
			//  'Erotic Dreams'
			//  'Submissive Female'
			//
			//ただし、pDisplayNameはユニークであること
		}
	}


	//==============================
	//グループ情報を作成
	//==============================
	//・g_groupNamesを作成
	//・g_nm2OのpGroupInfoに反映
	//
	let objHigherGroupCssTag = new Object();
	LabelSetGroupInfomation:	{
		console.log('LabelSetGroupInfomation');
		g_groupNames = new Object();

		//大文字・小文字を区別せずソートした順に処理を行う
		let groupKeys = Object.keys(objGroup);
		groupKeys.sort(compareLowerCase);
		//console.log(groupKeys);
		let groupSeq = 0;
		for(let groupName of groupKeys){
			let oneGroup = objGroup[groupName];
			let onePoseList = oneGroup.pPoseList;

			//console.log('groupName['+groupName+']/count:'+Object.keys(onePoseList).length);

			oneGroup.pGroupId = 'idGroup' + groupSeq++;
			oneGroup.pGroupInnerId = 'list' + oneGroup.pGroupId;
			oneGroup.pMemCount = Object.keys(onePoseList).length;
			oneGroup.pGroupName = groupName;

			//グループ情報の設定
			g_groupNames[groupName] = oneGroup;

			//グループメンバーにも情報を設定する
			for(let oneFile in onePoseList){
				g_nm2O[oneFile].pGroupInfo = oneGroup;
			}

			labelSetGroupCssTag:{
				let objUniqCssTag = new Object();
				let allCreatorTags = null;
				for(let oneFile in onePoseList){
					let objPose = g_nm2O[oneFile];
					let objCreator = objPose.pCreatorInfo;
					let creatorCssTag = objCreator.pCssTag;

					if (!(creatorCssTag in objUniqCssTag)){
						objUniqCssTag[creatorCssTag] = null;	//値はなんでもよい
						if(allCreatorTags!=null){
							allCreatorTags += ' ' + creatorCssTag;
						}else{
							allCreatorTags = creatorCssTag;
						}
					}
				}
				oneGroup.pCssTag = allCreatorTags;
			}
			labelSetHigherGroupCssTag:{

				let higherGroupName = oneGroup.pHigherGroupName;

				//グループへの製作者タグの設定
				let objUniqCssTag = new Object();
				let allCreatorTags = null;
				if(higherGroupName != null){
					//上位グループに関しては、上位の内容で処理する
					onePoseList = objHigherGroupName[higherGroupName];

					if(higherGroupName in objHigherGroupCssTag){
						allCreatorTags = objHigherGroupCssTag[higherGroupName];
					}
					//console.log('higherGroupName['+higherGroupName+']/count:'+Object.keys(onePoseList).length+'/allCreatorTags['+allCreatorTags+']');
				}
				if(allCreatorTags == null){
					//グループに属するポーズの製作者タグを重複しないように設定する。
					for(let oneFile in onePoseList){
						let objPose = g_nm2O[oneFile];
						let objCreator = objPose.pCreatorInfo;
						let creatorCssTag = objCreator.pCssTag;

						if (!(creatorCssTag in objUniqCssTag)){
							objUniqCssTag[creatorCssTag] = null;	//値はなんでもよい
							if(allCreatorTags!=null){
								allCreatorTags += ' ' + creatorCssTag;
							}else{
								allCreatorTags = creatorCssTag;
							}
						}
					}
				}

				if(allCreatorTags!=null){
					oneGroup.pHigherCssTag = allCreatorTags;

					if(higherGroupName != null){
						if(!(higherGroupName in objHigherGroupCssTag)){
							objHigherGroupCssTag[higherGroupName] = allCreatorTags;
						}
					}
				}
			}
		}
	}

	//バリエーション情報を作成
	makeVariationInfo();
}

//小文字にして比較
//先頭の記号は無視する
function compareLowerCase(a, b) {
	a = (a.replace(/^[^a-z\d]+/i,'')).toString().toLowerCase();
	b = (b.replace(/^[^a-z\d]+/i,'')).toString().toLowerCase();
	return (a > b) ?  1 :((b > a) ? -1 : 0);
}
function compareLowerCaseRev(a, b) {
	a = (a.replace(/^[^a-z\d]+/i,'')).toString().toLowerCase();
	b = (b.replace(/^[^a-z\d]+/i,'')).toString().toLowerCase();
	return (a < b) ?  1 :((b < a) ? -1 : 0);
}
//reverseが妙な動きをするので作成
function compareRev(a, b) {
	return (a < b) ?  1 :((b < a) ? -1 : 0);
}



//body部の内容を作成
//以下の理由で動的に書いている
//・LSLのメモリ負荷を下げる
//・リリース後の変更が可能
function makeBaseHtml(){
	function addElmDiv(argAppendObject,argId=null,argClassName=null){
		let objElement = document.createElement('div');
		if(argId != null){
			objElement.id = argId;
		}
		if(argClassName != null){
			objElement.className = argClassName;
		}

		if(argAppendObject != null){
			argAppendObject.appendChild(objElement);
		}
		return objElement;
	}
	function addElmSpan(argAppendObject,argId=null,argClassName=null,argOnClick){
		let objElement = document.createElement('span');
		if(argId != null){
			objElement.id = argId;
		}
		if(argClassName != null){
			objElement.className = argClassName;
		}

		objElement.onclick = argOnClick;

		if(argAppendObject != null){
			argAppendObject.appendChild(objElement);
		}
		return objElement;
	}

	function addElmSelect(argAppendObject,argId,argOnChange){
		let objElement = document.createElement('select');
		objElement.id = argId;
		objElement.onchange = argOnChange;

		return argAppendObject.appendChild(objElement);
	}

	function addElmButton(argAppendObject,argId,argClassName,argValue,argOnClick,argDoLineFeed=false){
		let objElement = document.createElement('input');
		objElement.type = 'button';
		if(argId != null){
			objElement.id = argId;
		}
		if(argClassName != null){
			objElement.className = argClassName;
		}
		objElement.value = argValue;
		objElement.onclick = argOnClick;

		argAppendObject.appendChild(objElement);
		if(argDoLineFeed){
			argAppendObject.appendChild(document.createElement('br'));
		}
	}

	function addElmCheckLabel(argAppendObject,argRadioName,argId,argCheckClassName,argLabelClassName,argChecked,argLabelText,argOnClick){
		let objCheckBox = document.createElement('input');
		if(argRadioName==null){
			objCheckBox.type = 'checkbox';
		}else{
			objCheckBox.type = 'radio';
			objCheckBox.name = argRadioName;
		}
		objCheckBox.id = argId;
		if(argCheckClassName!=null){
			objCheckBox.className = argCheckClassName;
		}
		objCheckBox.onclick = argOnClick;
		objCheckBox.checked = argChecked;

		let objLabel = document.createElement('label');
		objLabel.htmlFor = objCheckBox.id;
		objLabel.className = argLabelClassName;
		if(argLabelText != null){
			switch(typeof argLabelText){
			case "string":
				objLabel.innerHTML = argLabelText.replace(' ','&nbsp;').replace('<','&lt;').replace('>','&gt;');
				break;
			default:
				objLabel.appendChild(argLabelText);
				break;
			}
		}

		argAppendObject.appendChild(objCheckBox);
		argAppendObject.appendChild(objLabel);
		return objCheckBox;
	}

	function addElmFieldset(argAppendObject,argId,argCheckClassName,argLabelClassName,argLabelText,argObjLabel){
		let objFieldset = document.createElement('fieldset');
		if(argId!=null){
			objFieldset.id = argId;
		}
		if(argCheckClassName!=null){
			objFieldset.className = argCheckClassName;
		}

		let objLegend = document.createElement('legend');
		if(argLabelClassName!=null){
			objLegend.className = argLabelClassName;
		}
		if(argLabelText!=null){
			objLegend.innerHTML = argLabelText.replace(' ','&nbsp;').replace('<','&lt;').replace('>','&gt;');
		}
		if(argObjLabel!=null){
			objLegend.appendChild(argObjLabel);
		}

		argAppendObject.appendChild(objFieldset);
		objFieldset.appendChild(objLegend);
		return objFieldset;
	}

	g_objMain = addElmDiv(null,'idMain');

	let objCtrl = addElmDiv(g_objMain,'idCtrl');
	let elmCtrlCursor = addElmDiv(g_objMain,null,'csNoWakuCursor');
	let elmWakuProgress = addElmDiv(g_objMain,'idMessage','csWaku');

	let elmCtrlLeft = addElmDiv(objCtrl,null,'csNoWakuLeft');
	let elmCtrlRight = addElmDiv(objCtrl,null,'csNoWakuRight');

	//==============================
	//絞り込み・タイマー
	//==============================
	let elmWakuCreator = addElmFieldset(elmCtrlLeft,'idWakuCreator','csWaku',null,'creator',null);

	//製作者関係
	let elmWakuCreatorIn = addElmDiv(elmWakuCreator,'idWakuCreatorIn','csWaku');

	let elmWakuCreatorList = addElmDiv(elmWakuCreatorIn,'idCreatorListSet','csNoWaku');

	g_selCreator = addElmSelect(elmWakuCreatorList,'selCreatorIdx',function(){changeCreator();});
	let optAll = document.createElement('option');
	optAll.text = '---all creators---';
	optAll.value = 'all';
	g_selCreator.appendChild(optAll);
	addElmButton(elmWakuCreatorList,null,'csActBtn','CLR',function(){clearCreatorList();},true);
	addElmButton(elmWakuCreatorIn,null,'csActBtn','SET CURRENT CREATOR',function(){setCreatorList();});

	//==============================
	//HUDのコントロール
	//==============================

	let elmWakuCtrlHUD = addElmDiv(elmCtrlRight,'idCtrlRight','csCtrl');
	//再生ボタン
	g_btnPlay = addElmCheckLabel(elmWakuCtrlHUD,null,'playBtn','csActBtn','csCmnLbl csPlayLbl',true,'PLAY',function(){playCtrl();});
	let elmWakuCtrlHUD2 = addElmDiv(elmWakuCtrlHUD,null,'csCtrlIn');

	//HUD制御
	addElmSpan(elmWakuCtrlHUD2,null,'csIconWaku gg-remove-r'	,function(){sendCommand('MINI');});
	addElmSpan(elmWakuCtrlHUD2,null,'csIconWaku gg-close-r'		,function(){sendCommand('DETACH');});
	elmWakuCtrlHUD2.appendChild(document.createElement('br'));

	g_btnSay = addElmCheckLabel(elmWakuCtrlHUD2,null,'btnSay',null,'csBtnCmnLbl sayLabel'	,false,'Say',function(){changeSayMode()});

	//==============================
	//移動関係
	//==============================

	let elmWakuCursor = addElmDiv(elmCtrlCursor,null,'csNoWaku');

	//Tree⇔Flat切替ボタン
	let elmSwitchTree	= addElmDiv(elmWakuCursor,null,'csTreeSwitch');
	let elmSwitchMessage = document.createElement('span');
	g_btnTree		= addElmCheckLabel(elmSwitchTree,null,'btnTree'		,null,'csBtnCmnLbl displayLabel'	,true,elmSwitchMessage,function(){changeDisplayMode()});
	addElmDiv(elmSwitchTree,'idTreeSwitchBtn');

	let elmListWakuCtrl = addElmDiv(elmWakuCursor,'idListTypeInnerCtrl');

	//TreeList用
	let elmTabTree	= addElmDiv(elmListWakuCtrl,'idWakuTree','csTreeCommon');
	let elmTabTreeInner	= addElmDiv(elmTabTree,'idWakuTreeInner');
	g_btnGroup		= addElmCheckLabel(elmTabTreeInner,null,'btnGroup'		,null,'groupLabel'		,false,'group',function(){openCloseWaku();});
	g_btnVariation	= addElmCheckLabel(elmTabTreeInner,null,'btnVariation'	,null,'variationLabel'	,false,'variation',function(){openCloseWaku();});

	//FlatList用
	let elmTabFlat	= addElmDiv(elmListWakuCtrl,'idWakuFlat','csFlatCommon');
	let elmTabFlatInner	= addElmDiv(elmTabFlat,'idWakuFlatInner');
	g_searchText = document.createElement('input');
	g_searchText.type = 'search';
	g_searchText.id = 'searchText';
	g_searchText.placeholder = 'search String';
	elmTabFlatInner.appendChild(g_searchText);

	//カーソルとタイマー
	let elmWakuCursorBtns = addElmDiv(elmWakuCursor,null,'csCursorIn');

	//Timer
	g_btnTimer = addElmCheckLabel(elmWakuCursorBtns,null,'timerOn',null,'csTimerLbl',false,'timer',function(){timerAction();});
	g_selTimer = addElmSelect(elmWakuCursorBtns,'selTimer',function(){timerAction();});

	//timerの間隔設定
	const arrayTime = ([2,3,5,10,15,20,30,60,90,120]).sort((a, b) => a - b);
	arrayTime.forEach(function(element){
			let opt = document.createElement('option');
			opt.text = (opt.value = element);//+ ' sec';
			g_selTimer.appendChild(opt);
		});
	g_selTimer.selectedIndex = 0;

	//カーソルボタン
	addElmSpan(elmWakuCursorBtns,null,'csIconWaku gg-push-chevron-up-r'		,function(){cursorAction(true,true);});
	addElmSpan(elmWakuCursorBtns,null,'csIconWaku gg-chevron-up-r'			,function(){cursorAction(true,false);});
	addElmSpan(elmWakuCursorBtns,null,'csIconWaku gg-chevron-down-r'		,function(){cursorAction(false,false);});
	addElmSpan(elmWakuCursorBtns,null,'csIconWaku gg-push-chevron-down-r'	,function(){cursorAction(false,true);});

	//プログレスバー

	g_progressBar = document.createElement('progress');
	g_progressBar.id = 'progBar';
	g_progressBar.value = 0;
	g_progressBar.max = 100;
	elmWakuProgress.appendChild(g_progressBar);

	//ポーズ追加用のリスト
	g_poseTreeList = addElmDiv(null,g_IdTreeList,'csTreeCommon');
	g_poseFlatList = addElmDiv(null,g_IdFlatList,'csFlatCommon');

	let docBody = document.body;
	docBody.appendChild(g_objMain);

	$('#searchText').on('input', searchPose);

	setFieldset(true);
}

//ポーズ検索処理
function searchPose(){
	let serchText = g_searchText.value;
	if(serchText == ''){
		//全表示処理
		for(let oneName in g_nm2O){
			let objPose = g_nm2O[oneName];
			objPose.pElmFlatScrollTarget.classList.remove('csHide');
		}
	}
	serchText = serchText.toLowerCase();

	let displayString;
	for(let oneName in g_nm2O){
		let objPose = g_nm2O[oneName];
		if (objPose.pNameForSearch.indexOf(serchText) != -1) {
			objPose.pElmFlatScrollTarget.classList.remove('csHide');
		}else{
			objPose.pElmFlatScrollTarget.classList.add('csHide')
		}
	}
}

function setFieldset(argDisabled){
	document.getElementById('idWakuCreator').disabled = argDisabled;
//	document.getElementById('idWakuCursor').disabled = argDisabled;
	document.getElementById('idCtrlRight').disabled = argDisabled;

	g_searchText.disabled = argDisabled;

	g_btnTimer.disabled = argDisabled;
	g_btnPlay.disabled = argDisabled;
	g_btnTree.disabled = argDisabled;

	g_btnGroup.disabled = argDisabled;
	g_btnVariation.disabled = argDisabled;
	g_btnSay.disabled = argDisabled;

	setIconColor('--mClIcon',argDisabled);

	setIconColor('--mClIconSearch',g_searchText.disabled);
}

function setIconColor(argVariable,argDisabled){
	let rootStyle = document.documentElement.style;
//	let disabledColor = rootStyle.getPropertyValue('--mClDisabled');
	let disabledColor = '#a9a9a9';
	let colorValue = (argDisabled)?disabledColor:'black';

	rootStyle.setProperty(argVariable,colorValue);
}

//完了待ち処理
function receiveWait(){
	clearInterval(g_receiveId)

	if(!g_receiveEnd){
		//g_progressBar.value = g_progressValue;
		g_receiveId = setInterval(receiveWait,receiveMS);
	}else{
		//==============================
		//名前の正規化
		//==============================
		g_objNormalizationNameList =  makeNormalizationNameList(Object.keys(g_nm2O));

		//名前によるグルーピング
		groupingByName();

		//画面を作成する
		makeUI();
	}
}

$(document).ready(function() {
		//よく使うものを変数で持っておく
		g_objHead = document.getElementsByTagName('head').item(0);

		initShopInfo();

		makeBaseHtml();
		g_receiveEnd = false;

		//完了待ち
		g_receiveId = setInterval(receiveWait,receiveMS);

		requestList(g_dataTypeINIT,null,0);
	}
);
