//==============================
//正規表現パターン
//==============================
//数字と判断する
const g_allNumericRegExp = /^[\d#\. ]+$/;

const g_sameLimitLength = 2;

//==============================
//ポーズ情報
//==============================
let g_idx2O = new Array();	//index(0～) -> object
let g_nm2O = new Object();	//ポーズ名 -> object

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
let g_objHead,g_poseTreeList,g_poseFlatList,g_selTimer,g_btnPlay,g_btnTimer,g_btnFlat,g_btnGroup,g_btnVariation;

//==============================
//進捗用情報
//==============================
let g_debugtId;
//==============================
//要素作成後のオブジェクトの格納
//==============================
let g_namesPoses;
let g_namesPosesFlat;

//==============================
//連携用
//==============================
const g_dataTypeINIT = 'INIT';
const g_dataTypeLIST = 'LIST';
const g_dataTypeCREATOR = 'CREATOR';
let g_jsonData = null
let g_renkeiTid = null;
let g_totalCount = 0;
let g_currentIndex = 0;

//==============================
//システムであらかじめつくった上位グループ
//==============================
//	システムグループ名:システムグループに属するグループの情報が１つ(※)入っている
//	※上位グループの情報を参照するだけなので、複数あっても同じなので１つだけでいい。
let g_systemGroupList = new Object();
const g_numericGroupName = '#number |system group|';	//数値グループの上位
g_systemGroupList[g_numericGroupName] = null;


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
	let targetNameList = g_namesPoses;
	if(g_btnFlat.checked){
		targetNameList = g_namesPosesFlat;
	}

	for(let i=0;i<targetNameList.length;++i){
		if(targetNameList[i].checked){
			return i;
		}
	}
	return -1;
}
//argIsTopBottom	argIsPrev
//	true			true		TOP
//	true			false		BOTTOM
//	false			true		ひとつ前
//	false			false		ひとつ後(引数なしの場合の動作)
function cursorAction(argIsPrev=false,argIsTopBottom=false){
	let targetNameList = g_namesPoses;
	if(g_btnFlat.checked){
		targetNameList = g_namesPosesFlat;
	}

	//現在行を取得
	let curIndex = getCursorIndex();
	const indexMax = (targetNameList.length - 1);

	let objScrollTarget = null;

	function isHiddenRow(argCurIndex){
		let indexNo = targetNameList[argCurIndex].custIndexNo;
		let objPose = g_idx2O[indexNo];
		if(g_btnFlat.checked){
			objScrollTarget = objPose.pObjFlatScrollTarget;
		}else{
			objScrollTarget = objPose.pObjScrollTarget;
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
		for(let i=0;i<targetNameList.length;++i){
			curIndex += addVal;
			if(curIndex<0){curIndex = indexMax;
			}else if(curIndex>indexMax){curIndex = 0;
			}
			if(!isHiddenRow(curIndex)){
				break;
			}
		};
	}
	if(g_btnFlat.checked){
		g_poseFlatList.scrollTop = objScrollTarget.offsetTop - g_poseFlatList.offsetTop;
	}else{
		g_poseTreeList.scrollTop = objScrollTarget.offsetTop - g_poseTreeList.offsetTop;
	}

	targetNameList[curIndex].checked = true;
	//アニメショーン情報の送信
	sendCommand('CTRL',targetNameList[curIndex].custIndexNo);
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
		let targetNameList = g_namesPoses;
		if(g_btnFlat.checked){
			targetNameList = g_namesPosesFlat;
		}

		let nameIndex = getCursorIndex();
		if(nameIndex in targetNameList){
			curIndex = targetNameList[nameIndex].custIndexNo;
		}
	}
	sendCommand('CTRL',curIndex);
}


//製作者リスト切替処理
function changeCreator(){
	const styleId = 'cssCreator';
	delStyleSheet(styleId);
	if(event.target.value == 'all'){return;}

	let strCss = '';
	for(let oneUuid in g_uuid2O){
		let cssTag = g_uuid2O[oneUuid].pCssTag;
		let displayString = (event.target.value==cssTag) ? 'block' : 'none';
		strCss += '.' + cssTag + ' {display: ' + displayString + ';}';
	}

	addStyleElement(styleId,strCss);
}

function changeFlat(){
	const styleId = 'cssDisplayFlat';
	delStyleSheet(styleId);

	let targetDisplayTag = 'dPoseTreeList';
	let targetHiddenTag = 'dPoseFlatList';
	if(g_btnFlat.checked){
		targetDisplayTag = 'dPoseFlatList';
		targetHiddenTag = 'dPoseTreeList';
	}
	addStyleElement(styleId,'#' + targetDisplayTag + ' {display: block;}'+'#' + targetHiddenTag + ' {display: none;}');
	g_btnGroup.disabled = g_btnFlat.checked;
	g_btnVariation.disabled = g_btnFlat.checked;

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
		for(let i=0 ;i<objNameList.length;++i){
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

	$.ajax(
		{
			'type': 'POST'
			,'url': location.href
			,'data': requestData
		}
	).done(
		function(data) {
			let jsonData = JSON.parse(data);
			g_jsonData = jsonData;
			g_renkeiTid = setInterval(testA,10);
		}
	).fail(
		function(data) {
			if (data.status == 504) {
				// timeout -> retry
				requestList(argDataType,argCreatorUuidCsv,argCurrentIndex);
			}
		}
	);
}

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

function testA(){
	clearInterval(g_renkeiTid);

	if(g_jsonData.dType==g_dataTypeINIT){
		//トータルレコード数
		g_totalCount = g_jsonData.COUNT;
		updateProgress(g_totalCount);

		//ゼロ件の場合の処理をいれること
		//→基本的にゼロ件の時は動かないようになっている。

		if(g_currentIndex < g_totalCount){
			//初回連携開始
			requestList(g_dataTypeLIST,null,(g_currentIndex = 0));
		}
	}else{
		g_currentIndex += makePoseInfo(g_jsonData);

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
		//==============================
		//名前の正規化
		//==============================
		g_objNormalizationNameList =  makeNormalizationNameList();

		//名前によるグルーピング
		groupingByName();
		//画面を作成する
		makeUI();
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
		command = 'CTRL,' + argIndexNo;
	}
	if(argIndexNo>=0){
		//再生指示
		if(! g_btnPlay.checked){
			//停止状態なら送らない
			return;
		}
	}
	$.ajax(
		{
			'type': 'POST'
			,'url': location.href
			,'data' : command
		}
	).done(
		function(data) {
			//何もしない
		}
	).fail(
		function(data) {
			if (data.status == 504) {
				// timeout -> retry
				sendCommand(argAction,argIndexNo);
			}
		}
	);
}


//JSON情報をオブジェクトに変換
function makePoseInfo(argJsonData){
	let addPoseCount = 0;
	if(argJsonData.dType == g_dataTypeCREATOR){

		//製作者情報リスト（'|'区切り）を分割
		let creatorListPsv = (argJsonData.uuidList).split('|');
		for(let i=0;i<creatorListPsv.length;i+=2){
			let creatorName = unescape(creatorListPsv[i]);
			let creatorUuid = unescape(creatorListPsv[i+1]);
			//console.log(creatorUuid+':'+creatorName);
			let objCreator = g_uuid2O[creatorUuid];
			objCreator.pName = creatorName.replace(/ Resident$/,'');	//製作者名末尾の'Resident'は不要
		}

		return addPoseCount;
	}

	//animation情報格納用のオブジェクト作成
	function makeObjPose(argIndexNo,argPoseName,argCreatorUuid) {
		//製作者情報の作成
		if(!(argCreatorUuid in g_uuid2O)){

			//製作者用cssタグの連番（0～
			let creatorSeq = Object.keys(g_uuid2O).length;

			g_uuid2O[argCreatorUuid] = {
				 pNo : creatorSeq
				,pCssTag : 'css_creator_' + creatorSeq
				,pName : null		//nullの場合、名前要求をする
			}
		}
		let objCreator = g_uuid2O[argCreatorUuid];


		//名前の正規化
		//区切り文字の前後の空白を削除する
		let normalizationName = argPoseName.replace(/[ ]*(\W)[ ]*/g,'$1');
		//連続した空白をまとめる
		normalizationName = normalizationName.replace(/[ ][ ]*/g,' ');

		let objMe = {
				//連携情報
				 pIndexNo : argIndexNo		//HUDのコンテンツ内の連番(0～
				,pName : argPoseName		//ポーズ名
				,pUuid : argCreatorUuid		//製作者UUID
				,pNormalizationName : normalizationName	//正規化した名前

				//表示用文字列
				//※バリエーションだと判定された場合加工される
				,pDisplayName : argPoseName

				//バリエーション情報
				,pIsParent : false			//バリエーションが存在する
				,pVariationNameList : null	//バリエーションの名前リスト(ソート済)
				,pIsVariation : false		//これはバリエーションか
				,pObjParent : null			//親のオブジェクト	※バリエーションの場合のみ設定

				//HTML情報
				,pObjScrollTarget : null	//順送りボタンによる移動のためのスクロール先
				,pObjFlatScrollTarget : null	//順送りボタンによる移動のためのスクロール先
				,pVariationArea : null		//HTML内のバリエーション格納エリア

				//名前によるグループ情報
				,pGroupInfo : null		//グループ情報
				,pIsGrouped : false		//このメンバーがグループに入ったか

				//製作者情報
				,pCreatorInfo : objCreator
			}
		return objMe;
	}

	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/

	//ポーズリスト（'|'区切り）を分割
	let poseListPsv = (argJsonData.poseList).split('|');

	for(let i=0;i<poseListPsv.length;i+=3){
		let psvIndex = poseListPsv[i];				//in worldのcontentsの連番（０～
		let psvName = unescape(poseListPsv[i+1]);	//ポーズ名
		let psvUuid = poseListPsv[i+2];				//製作者のUuid

		if ( psvIndex in g_idx2O ){
			//ありえないが同じデータがきたらスキップ
			continue;
		}

		++addPoseCount;
		updateProgress();

		let objPose = makeObjPose(psvIndex,psvName,psvUuid);

		g_nm2O[objPose.pName] = objPose;
		g_idx2O[objPose.pIndexNo] = objPose;
	}
	//追加したポーズ数を返す
	return addPoseCount;
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
//正規化したことで名前が重複した場合
//	正規化した名前の後に「タブ＋連番」を追加する
function makeNormalizationNameList(){
	let objNormalizationName = new Object();
	let objNormalizationNameUniq = new Object();
	for(let oneName in g_nm2O){
		let normalizationKey = cnvNum(g_nm2O[oneName].pNormalizationName);
		if(normalizationKey in objNormalizationNameUniq){
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
			objLabel.innerHTML = argText.replace(' ','&nbsp;');
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
			argObjPose.pVariationArea = objVariationArea;
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
		if(argIsHighGroup){
			outerCssTag = 'csHigherGroupWaku';
			outerLabelCssTag = 'csHigherGroupLbl';
			outerId = argObjGroup.pHigherGroupId;
			innerId = argObjGroup.pHigherGroupInnerId;
			groupName = argObjGroup.pHigherGroupName;
			doAddGroupLabel = true;
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
			objOuterWaku.className = outerCssTag + ' ' + argObjGroup.pCssTag;

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
	//正規化した名前のソート
	//==============================
	//空白の数などで並びが変わってしまうため
	let normalKeys = Object.keys(g_objNormalizationNameList);
	normalKeys.sort(compareLowerCase);

	//フラットなポーズリストを作成する
	for(let oneNormalName of normalKeys){
		let oneName = g_objNormalizationNameList[oneNormalName];
		let objPose = g_nm2O[oneName];

		let strClassName = 'csPoseLbl';
		let objWaku = makePartsPoseName(objPose,objPose.pCreatorInfo.pCssTag,strClassName,true);
		objPose.pObjFlatScrollTarget = objWaku;
		g_poseFlatList.appendChild(objWaku);
	}

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
		let objWaku = makePartsPoseName(objPose,objPose.pCreatorInfo.pCssTag,strClassName);
		objPose.pObjScrollTarget = objWaku;

		if(objPose.pIsParent){
			//親である場合

			let objVariationNameList = objPose.pVariationNameList;
			if(objVariationNameList!=null){
				//バリエーションを列挙する
				let objVariationArea = objPose.pVariationArea;
				for(let variationKey of objVariationNameList){
					let objPoseVariation = g_nm2O[variationKey];

					//------------------------------
					//radioとラベルを囲む枠
					//------------------------------
					let objVariationWaku = makePartsPoseName(objPoseVariation,'csVarOne','csVarLbl');

					objPoseVariation.pObjScrollTarget = objVariationWaku;

					//親のバリエーション格納用フィールドに入れる
					objVariationArea.appendChild(objVariationWaku);
				}
			}
		}

		let objInnerWaku = document.getElementById(objPose.pGroupInfo.pGroupInnerId);
		objInnerWaku.appendChild(objWaku);
	}

	//リストボックスの追加
	let objSelect = document.getElementById('selCreatorIdx');
	let nameList = new Object();
	for(let oneUuid in g_uuid2O){
		let objCreator = g_uuid2O[oneUuid];
		nameList[objCreator.pName] = objCreator;
	}
	let nameKeys = Object.keys(nameList);
	nameKeys.sort(compareLowerCase);

	let optAll = document.createElement('option');
	optAll.text = '---all creators---';
	optAll.value = 'all';
	objSelect.appendChild(optAll);

	for(let oneName of nameKeys){
		let objCreator = nameList[oneName];
		let opt = document.createElement('option');
		opt.text = objCreator.pName;
		opt.value = objCreator.pCssTag;
		objSelect.appendChild(opt);
	}

	g_namesPoses = document.getElementsByName('namesPoseList');
	g_namesPosesFlat = document.getElementsByName('namesPoseListFlat');

	//チェック状態に応じて初期状態にする
	openCloseWaku('btnGroup',false);
	openCloseWaku('btnVariation',false);
	changeFlat();

	addStyleElement('cssDisplayMain','#csMain{display:block;}#csProgress{display:none;}');

	//画面のリサイズはかからない前提
	let divHeight = (document.documentElement.clientHeight - g_poseTreeList.offsetTop) + 'px';
	g_poseTreeList.style.height = divHeight;
	g_poseFlatList.style.height = divHeight;
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
//パターン③ todo SAPA対応
//
//	数値A.数値B.数値Cの場合数値Cはバリエーション扱いする
//
function makeVariationSub(argPoseKeyList,argPoseNameList){
	const isPriorityRegExp = /^(.*)\b((?:P|Priority|V|Version)[ _=\-]*\d)$/i;	//優先度っぽいか
	const isPriorityQuatRegExp = /^(.*)\b([\(\[]*(?:P|Priority|V|Version)[ _=\-]*\d[/)/]]*)$/i;	//優先度っぽいか
	const regExpArray = Array(isPriorityRegExp,isPriorityQuatRegExp);
	const wordSeparatorRegExp = /([^a-z_])/i;				//単語と判断して区切らない文字列

	function setVariarion(argObjVariation,argDispay,argObjParent){
		let objPoseParent = argObjParent;

		if(objPoseParent.pIsVariation){
			//親に指定しようとしているものがバリエーションだった場合

			//親の親を取得
			argObjParent = objPoseParent.pObjParent;

			if(argObjVariation.pNormalizationName.startsWith(argObjParent.pNormalizationName)){
				//親との差異を取得する
				//	①親
				//	②┗バリエーション
				//	③　┗バリエーション
				//今回の対象が③の場合、②と③の差異文字列よりも
				//①と③の差異文字列の方が、適切なバリエーション用差分文字列が取得できる可能性が高い。
				//
				//ポーズ②の名前がポーズ①の名前から始まる
				//	①'aaaaaa'
				//	②'aaaaaaM'
				//	上記の場合、②は①のバリエーションと判断する

				argDispay = (argObjVariation.pNormalizationName.slice(argObjParent.pNormalizationName.length)).trim();
			}else{
				argDispay = objPoseParent.pDisplayName + ' ' + argDispay;
			}
		}else{
			//親側の設定
			objPoseParent.pIsParent = true;
		}
		//バリエーション側の設定
		argObjVariation.pIsParent = false;		//すでに親認定されている場合もあるので解除
		argObjVariation.pIsVariation = true;
		argObjVariation.pDisplayName = argDispay;
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
		setVariarion(objPoseVariation,diffstr,objParent);
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
					setVariarion(objPose,diffstr,objPoseBase);
				}
			}else {
				let isPriority = false;

				for(let i in regExpArray){
					let regExpPettern = regExpArray[i];
					if(poseNameBase.match(regExpPettern) && poseNameTarget.match(regExpPettern)){
						//優先度っぽい感じなら
						//優先度文字列を抜くと一致するかチェック
						let substredBase  = poseNameBase.replace(regExpPettern,'$1');
						let substredTarget= poseNameTarget.replace(regExpPettern,'$1');
						if(substredBase == substredTarget){
							let priorityBase  = poseNameBase.replace(regExpPettern,'$2');
							let priorityTarget= poseNameTarget.replace(regExpPettern,'$2');
							if(priorityBase<priorityTarget){
								//console.log('Priority:['+priorityBase+']['+poseNameBase+']['+priorityTarget+']['+poseNameTarget+']');
								setVariarion(objPose,priorityTarget,objPoseBase);
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
		}else if(objPose.pIsVariation){
			//前後につく記号を削除する
			//	todo:バリエーションでは使わないので、この処理は不要
			let displayString = objPose.pDisplayName
			displayString = displayString.replace(/^[^a-z0-9]+/i,``);
			displayString = displayString.replace(/[^a-z0-9]+$/i,``);
			if(displayString!=''){
				objPose.pDisplayName = displayString;
			}
		}
	}
}

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

//名前でグループ化する
function groupingByName(){
	//グループ化の際に文字列を区切る
	const wordSeparatorForGroupRegExp = /(\W)/;
	//最後の優先度を含んだ数字を削除
	//	'Aiko Animation 1 Priority 4'
	//		↓
	//	'Aiko Animation 1'
	const delPriorityRegExp = /^(.*[a-z][^a-z]+)[ ]*(P|Priority|V|Version)[ ]*[^a-z]+$/i;
	//最後の数字などを除去
	//	'STUN Anim - Malvene 1'
	//		↓
	//	'STUN Anim - Malvene'
	const delLastNumericRegExp = /^(.*[a-z])[^a-z]+$/i;

	let objGroup = new Object();

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
			};
	}

	//グループ情報を移動する
	function fullNameMove(argGroupNameTo,argGroupNameFrom,argIsMove,argPoseList){
		let objFromPoseList = argPoseList;
		if(argGroupNameFrom!=null){
			if(argGroupNameFrom==argGroupNameTo){
				//移動前後のグループが同じなら処理しない
				return;
			}
			objFromPoseList = objGroup[argGroupNameFrom].pPoseList;
		}

		let objToPoseList = objGroup[argGroupNameTo].pPoseList;
		for(let oneKey in objFromPoseList){
			objToPoseList[oneKey] = objFromPoseList[oneKey];
			delete objFromPoseList[oneKey];
		}
		if(argIsMove){
			//処理済情報は削除する
			delete objGroup[argGroupNameFrom];
		}
	}

	//２つの文字列の比較
	//	一致しなければnull
	//	一致する箇所があれば、一致部分のみを返す
	function compareName(argPoseA,argPoseB,argIsMarume=false){
		if(argPoseA==argPoseB){
			return argPoseA;	//２つの文字列は絶対異なるが念のため
		}
		let retString = '';
		let sameLen = 0;

		if(argPoseA.match(wordSeparatorForGroupRegExp)
			&& argPoseB.match(wordSeparatorForGroupRegExp)
			&& argPoseA.match(g_allNumericRegExp)
			&& argPoseB.match(g_allNumericRegExp)){
			//数値要素だけの文字列で
			//単語区切りができそうなら、単語区切りで比較する。

			//※以下を別のグループと認識できるようにするため
			//	'151.1'
			//	'159.1.1'
			let arrayA = argPoseA.split(wordSeparatorForGroupRegExp);
			let arrayB = argPoseB.split(wordSeparatorForGroupRegExp);
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
		}else{
			//２つの文字列の共通部分を取得する
			let maxLen = Math.min(argPoseA.length,argPoseB.length);
			for(let len=g_sameLimitLength;len<=maxLen;++len){
				let poseA = argPoseA.substr(0,len);
				if(poseA == argPoseB.substr(0,len)){
					//一致する最長の長さを設定
					sameLen = len;
					retString = poseA;
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
			if((diffA=='')&&(diffB=='')){
				return (retString=='')?null:retString;
			}else{
				return null;
			}
		}
		return (retString=='')?null:retString;
	}

	//比較用にポーズ名を加工する
	function modifyForCompare(argPoseName){
		let returnPoseName = argPoseName;
		returnPoseName = returnPoseName.replace(delPriorityRegExp,'$1');
		returnPoseName = returnPoseName.replace(delLastNumericRegExp,'$1');
		return returnPoseName;
	}

	//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/

	//==============================
	//正規化した名前のソート
	//==============================
	//空白の数などで並びが変わってしまうため
	let normalKeys = Object.keys(g_objNormalizationNameList);
	normalKeys.sort();

	//==============================
	//上の行・下の行での比較を行う。
	//==============================
	//同一製作者かどうかは問わない
	//※todo:この時点で同一製作者単位で処理を行ってもよかったかもしれない。

	//グループ名候補リストを作成
	let objGroupNameCandidateList = new Object();
	let objPosePre = null;
	for(let oneNormalName of normalKeys){
		let oneName = g_objNormalizationNameList[oneNormalName];
		let objPose = g_nm2O[oneName];

		let poseName = objPose.pName;

		//比較用にポーズ名を加工する
		let compName = modifyForCompare(objPose.pNormalizationName);

		if(objPosePre!=null){
			//比較用にポーズ名を加工する
			let compNamePre = modifyForCompare(objPosePre.pNormalizationName);

			let groupName = compareName(compNamePre,compName,false);
			if(groupName!=null){
				groupName = groupName.trimEnd();
				if(!(groupName in objGroupNameCandidateList)){
					objGroupNameCandidateList[groupName] = null;
				}
			}
		}
		objPosePre = objPose;
	}

	//候補を降順に並び替える（基本的に文字列長が長い順に処理したい）
	let candidateKeys = Object.keys(objGroupNameCandidateList);
	candidateKeys.sort(compareLowerCaseRev);

	//厳密なグループ化
	for(let oneCandidate of candidateKeys){
		for(let oneNormalName of normalKeys){
			let oneName = g_objNormalizationNameList[oneNormalName];
			let objPose = g_nm2O[oneName];
			if(objPose.pIsGrouped){
				continue;
			}

			//比較用にポーズ名を加工する
			let compName = modifyForCompare(objPose.pNormalizationName);

			if(myStartsWith(compName,oneCandidate)){
				objPose.pIsGrouped = true;

				let objPoseList = new Object();
				objPoseList[oneName] = objPose.pName;

				//グループに属するファイルが存在する場合のみ処理を行う。
				if(!(oneCandidate in objGroup)){
					objGroup[oneCandidate] = makeNewGroup(objPoseList);
				}else{
					//既存であれば、ファイルリストをコピーする
					fullNameMove(oneCandidate,null,false,objPoseList);
				}
			}
		}
	}
	//↑↓のループはまとめないこと
	//単純なグループ化
	for(let oneCandidate of candidateKeys){
		for(let oneNormalName of normalKeys){
			let oneName = g_objNormalizationNameList[oneNormalName];
			let objPose = g_nm2O[oneName];
			if(objPose.pIsGrouped){
				continue;
			}

			//比較用にポーズ名を加工する
			let compName = modifyForCompare(objPose.pNormalizationName);

			if(compName.startsWith(oneCandidate)){
				objPose.pIsGrouped = true;

				let objPoseList = new Object();
				objPoseList[oneName] = objPose.pName;

				//グループに属するファイルが存在する場合のみ処理を行う。
				if(!(oneCandidate in objGroup)){
					objGroup[oneCandidate] = makeNewGroup(objPoseList);
				}else{
					//既存であれば、ファイルリストをコピーする
					fullNameMove(oneCandidate,null,false,objPoseList);
				}
			}
		}
	}

	//==============================
	//グループ化されなかったものを追加
	//==============================
	for(let i in g_idx2O){
		let objPose = g_idx2O[i];

		if(objPose.pIsGrouped){
			continue;
		}
		objPose.pIsGrouped = true;
		let poseName = objPose.pName;
		let groupName = objPose.pNormalizationName;
		console.log('poseName['+poseName+']');
		let oneGroup = (objGroup[groupName] = makeNewGroup(null));
		oneGroup.pPoseList[poseName] = poseName;
	}

	//==============================
	//グループ名の正規化
	//==============================
	for(let oneGroupName in objGroup){
		//末尾の不要な文字列を削除する
		let newGroupName = oneGroupName.replace(delLastNumericRegExp,'$1');

		if(!(newGroupName in objGroup)){
			//console.log('newGroupName:['+newGroupName+']'+oneGroupName);
			objGroup[newGroupName] = makeNewGroup(null);
			fullNameMove(newGroupName,oneGroupName,true);
		}
	}

	let groupNamePre = null;
	let groupKeys = Object.keys(objGroup);
	//==============================
	//まとめられるグループの対応①
	//==============================
	//	まるめ後の比較
	//	末尾数字の差異などは、同じグループと判断する
	groupKeys.sort();
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
				fullNameMove(mergeGroupName,groupNamePre,true);
				fullNameMove(mergeGroupName,groupName,true);

				groupNamePre = mergeGroupName;
			}else{
				//console.log('none groupNamePre:['+groupNamePre+']groupName:['+groupName+']');
				groupNamePre = groupName;
			}
		}else{
			groupNamePre = groupName;
		}
	}

	//==============================
	//まとめられるグループの対応②
	//==============================
	//今のグループ名に、前のグループ名が含まれている場合
	//前のグループに統合する
	groupKeys = Object.keys(objGroup);
	groupKeys.sort();
	for(let groupName of groupKeys){
		if(groupNamePre!=null){
			if(myStartsWith(groupName,groupNamePre)){

				fullNameMove(groupNamePre,groupName,true);

				groupName = groupNamePre;
			}else{
				//console.log('none2 groupNamePre:['+groupNamePre+']groupName:['+groupName+']');
			}
		}
		groupNamePre = groupName;
	}

	//製作者のタグリスト
	//※後続の階層作成に使用する
	let objCreatorTagList = new Object();

	//作者別にグループを分ける
	//・グループに作者のclassNameを紐づける
	//・同一グループに複数名の作者が混ざっている場合は
	//	複数グループに分ける
	for(let groupName in objGroup){
		let oneGroup = objGroup[groupName];

		//グループ内のポーズの製作者数（種類の数）
		let objCreatorUniqCount = new Object();
		let creatorCssTag = null;

		//１つのグループ内の全ファイルをチェックする
		for(let oneFile in oneGroup.pPoseList){
			let objPose = g_nm2O[oneGroup.pPoseList[oneFile]];

			let objCreator = objPose.pCreatorInfo;
			creatorCssTag = objCreator.pCssTag;
			if (!(creatorCssTag in objCreatorUniqCount)){
				objCreatorUniqCount[creatorCssTag] = objCreator.pName;
				if(Object.keys(objCreatorUniqCount).length>1){
					break;
				}
			}
		}
		if(Object.keys(objCreatorUniqCount).length<=1){
			oneGroup.pCssTag = creatorCssTag;
			let oneCreatorTag = objCreatorTagList[creatorCssTag] = new Object();
			oneCreatorTag.pGroupNameList = new Object();
			oneCreatorTag.pHigerGroupNameList = null;	//上位グループ名と上位グループ番号が入る
			//グループ内の製作者が一人ならここで終わり
			continue;
		}

		//グループ内の製作者が複数いる場合、製作者ごとに分ける
		//・全てのグループ名を「グループ名＋(creator:製作者名)」とし
		//	元のグループ名を削除する
		let objUniqCssTag = new Object();
		let objPoseListOrg = oneGroup.pPoseList;
		//１つのグループ内の全ファイルをチェックする
		for(let oneFile in oneGroup.pPoseList){
			let objPose = g_nm2O[oneGroup.pPoseList[oneFile]];
			let objCreator = objPose.pCreatorInfo;
			let creatorCssTag = objCreator.pCssTag;

			let newGroupName = groupName + ' (creator : ' + objCreator.pName + ')';
			if (!(creatorCssTag in objUniqCssTag)){
				objUniqCssTag[creatorCssTag] = true;	//値はなんでもよい
				objGroup[newGroupName] = makeNewGroup(null);
				let oneCreatorTag = objCreatorTagList[creatorCssTag] = new Object();
				oneCreatorTag.pGroupNameList = new Object();
				oneCreatorTag.pHigerGroupNameList = null;	//上位グループ名と上位グループ番号が入る
			}
			objGroup[newGroupName].pCssTag = creatorCssTag;
			//新しいグループにファイル名を追加する
			let objPoseList = objGroup[newGroupName].pPoseList;
			objPoseList[oneFile] = objPose.pName;

			//元のグループからファイル情報を削除する
			delete objPoseListOrg[oneFile];
		}
		delete objGroup[groupName];
	}

	//==============================
	//上位のグループ情報を作成する
	//==============================
	//グループ名の共通部分をチェックする
	//※同一製作者の場合のみ

	//グループ情報を作成
	//大文字・小文字を区別せずソートした順に処理を行う
	groupKeys = Object.keys(objGroup);
	groupKeys.sort(compareLowerCase);
	let higherGroupSeq = 0;
	for(let oneCreatorTag in objCreatorTagList){
		//製作者単位で処理を行う
		let oneCreatorGroup = objCreatorTagList[oneCreatorTag];
		//製作者ごとにグループ名のリストを作成する
		//	名前順に処理をする
		for(let groupName of groupKeys){
			let oneGroup = objGroup[groupName];
			if(oneGroup.pCssTag == oneCreatorTag){
				oneCreatorGroup.pGroupNameList[groupName] = groupName;
			}
		}

		if(Object.keys(oneCreatorGroup.pGroupNameList).length<=1){
			continue;
		}

		//グループ名の共通部分をまとめる
		//	二周回す
		let groupNamePre = null;
		for(let i=0;i<2;++i){
			let newGroupList = new Object();
			let srcGroupList = (i==0)?oneCreatorGroup.pGroupNameList:oneCreatorGroup.pHigerGroupNameList
			for(let groupName in srcGroupList){
				//元になるグループ名を設定する
				let oneGroup = objGroup[groupName];

				if(groupName.match(/^\d./)){
					//１桁目が数字の場合、数字グループを作成する
					if(!(g_numericGroupName in newGroupList)){
						//上位グループ名と連番を採番
						newGroupList[g_numericGroupName] = higherGroupSeq++;
					}
				}else{
					if(groupNamePre != null){
						let sameName = compareName(groupNamePre,groupName,false);
						if(sameName!=null){
							sameName = sameName.replace(delLastNumericRegExp,'$1');
							if(!(sameName in newGroupList)){
								//上位グループ名と連番を採番
								newGroupList[sameName] = higherGroupSeq++;
							}
						}else{
							//console.log('none3 groupNamePre:['+groupNamePre+']groupName:['+groupName+']');
						}
					}
				}
				groupNamePre = groupName;
			}
			let groupListLen = Object.keys(newGroupList).length;
			if(groupListLen>0){
				oneCreatorGroup.pHigerGroupNameList = newGroupList;
				if(groupListLen==1){
					break;
				}
				srcGroupList = newGroupList;
			}
		}

		if(oneCreatorGroup.pHigerGroupNameList == null){
			//上位グループができなかった場合
			continue;
		}

		//全てのグループに、属している上位グループの情報を設定する
		for(let higherGroupName in oneCreatorGroup.pHigerGroupNameList){
			let higherGroupId = 'idHigerGroup' + oneCreatorGroup.pHigerGroupNameList[higherGroupName];

			//全ての上位グループ名に対して処理を行う
			for(let groupName in oneCreatorGroup.pGroupNameList){
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

	//==============================
	//グループ情報を作成
	//==============================
	//・g_groupNamesを作成
	//・g_nm2OのpGroupInfoに反映
	//
	g_groupNames = new Object();

	//大文字・小文字を区別せずソートした順に処理を行う
	groupKeys = Object.keys(objGroup);
	groupKeys.sort(compareLowerCase);
	//console.log(groupKeys);
	let groupSeq = 0;
	for(let groupName of groupKeys){
		let oneGroup = objGroup[groupName];
		let onePoseList = oneGroup.pPoseList;

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

//プログレスバー設定
function updateProgress(argTotalCounter=null){
	if(argTotalCounter!=null){
		updateProgress.objBar = document.getElementById('progBar');
		updateProgress.objBar.max = argTotalCounter;
		updateProgress.objBar.value = 0;

		updateProgress.counter = 0;
		return;
	}
	++updateProgress.counter;
	updateProgress.objBar.value = updateProgress.counter;
}

function makeBaseHtml(){
	function addElementDiv(argAppendObject,argId=null,argClassName=null){
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

	function addElementSelect(argAppendObject,argId,argOnChange){
		let objElement = document.createElement('select');
		objElement.id = argId;
		objElement.onchange = argOnChange;

		return argAppendObject.appendChild(objElement);
	}

	function addElementButton(argAppendObject,argId,argClassName,argValue,argOnClick,argDoLineFeed){
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

	function addElementCheckAndLabel(argAppendObject,argId,argCheckClassName,argLabelClassName,argChecked,argLabelText,argOnClick){
		let objCheckBox = document.createElement('input');
		objCheckBox.type = 'checkbox';
		objCheckBox.id = argId;
		if(argCheckClassName!=null){
			objCheckBox.className = argCheckClassName;
		}
		objCheckBox.onclick = argOnClick;
		objCheckBox.checked = argChecked;

		let objLabel = document.createElement('label');
		objLabel.htmlFor = objCheckBox.id;
		objLabel.className = argLabelClassName;
		objLabel.innerHTML = argLabelText.replace(' ','&nbsp;');

		argAppendObject.appendChild(objCheckBox);
		argAppendObject.appendChild(objLabel);
		return objCheckBox;
	}

	let objMain = addElementDiv(null,'csMain');
	let objCtrl = addElementDiv(objMain,'csCtrl');

	//==============================
	//絞り込み・タイマー
	//==============================
	let objCtrl01 = addElementDiv(objCtrl,null,'csNoWaku1');
	let objCtrl01Sub01 = addElementDiv(objCtrl01,null,'csWaku');

	addElementSelect(objCtrl01Sub01,'selCreatorIdx',function(){changeCreator();});
	objCtrl01Sub01.appendChild(document.createElement('br'));
	g_btnFlat = addElementCheckAndLabel(objCtrl01Sub01,'btnFlat',null,'displayLabel csCmnLbl',false,'flat mode',function(){changeFlat()});
	g_btnGroup = addElementCheckAndLabel(objCtrl01Sub01,'btnGroup',null,'groupLabel csCmnLbl',false,'group',function(){openCloseWaku();});
	g_btnVariation = addElementCheckAndLabel(objCtrl01Sub01,'btnVariation',null,'variationLabel csCmnLbl',false,'variations',function(){openCloseWaku();});


	let objCtrl01Sub02 = addElementDiv(objCtrl01,null,'csWaku');

	g_btnTimer = addElementCheckAndLabel(objCtrl01Sub02,'timerOn',null,'csTimerLbl csCmnLbl',false,'timer',function(){timerAction();});
	g_selTimer = addElementSelect(objCtrl01Sub02,'selTimer',function(){timerAction();});

	//timerの間隔設定
	const arrayTime = ([2,3,5,10,15,20,30,60,90,120]).sort((a, b) => a - b);
	arrayTime.forEach(function(element){
			let opt = document.createElement('option');
			opt.text = (opt.value = element)+ ' sec';
			g_selTimer.appendChild(opt);
		});
	g_selTimer.selectedIndex = 0;

	//==============================
	//カーソル
	//==============================
	let objCtrl02 = addElementDiv(objCtrl,null,'csNoWaku2');
	addElementButton(objCtrl02,null,null,'⤒',function(){cursorAction(true,true);},true);
	addElementButton(objCtrl02,null,null,'↑',function(){cursorAction(true,false);},true);
	addElementButton(objCtrl02,null,null,'↓',function(){cursorAction(false,false);},true);
	addElementButton(objCtrl02,null,null,'⤓',function(){cursorAction(false,true);},false);

	//==============================
	//HUDのコントロール
	//==============================
	let objCtrl03 = addElementDiv(objCtrl,null,'csNoWaku3');

	addElementButton(objCtrl03,null,'csActBtn csMiniBtn','MINI',function(){sendCommand('MINI');},true);
	addElementButton(objCtrl03,null,'csActBtn csDetachBtn','DETACH',function(){sendCommand('DETACH');},true);

	g_btnPlay = addElementCheckAndLabel(objCtrl03,'playBtn','csActBtn','csPlayLbl csCmnLbl',true,'PLAY',function(){playCtrl();});

	//==============================
	//ポーズリスト
	//==============================
	g_poseTreeList = addElementDiv(objMain,'dPoseTreeList');
	g_poseFlatList = addElementDiv(objMain,'dPoseFlatList');

	//==============================
	//プログレスバー
	//==============================
	let objProgressWaku = addElementDiv(null,'csProgress');
	let objProgress = document.createElement('progBar');
	objProgress.id = 'progBar';
	objProgress.value = 0;
	objProgress.max = 100;
	objProgressWaku.appendChild(objProgress);

	let docBody = document.body;
	docBody.appendChild(objMain);
	docBody.appendChild(objProgressWaku);
}

$(document).ready(function() {
		//よく使うものを変数で持っておく
		g_objHead = document.getElementsByTagName('head').item(0);

		makeBaseHtml();

		let isLocal = (location.href).startsWith('file://');
		if(isLocal){
			g_debugtId = setInterval(debugExecute,500);
		}else{
			requestList(g_dataTypeINIT,null,0);
		}
	}
);
