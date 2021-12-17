//==============================
//ポーズ情報
//==============================
let g_idx2O = new Array();	//index(0～) -> object
let g_nm2O = new Object();	//ポーズ名 -> object
//==============================
//クリエーター名を指すcss class Id
//==============================
//creator uuid -> object
let g_uuid2O = new Object();
//==============================
//グループ名リスト（ソート済）
//==============================
let g_groupNames = new Object();

//==============================
//load後のオブジェクトの格納
//==============================
let g_objHead,g_poseList,g_selTimer,g_btnPlay,g_btnTimer;

//==============================
//進捗用情報
//==============================
let g_debugtId;
//==============================
//要素作成後のオブジェクトの格納
//==============================
let g_namesPoses;

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
//連携用
//==============================
const g_numericGroupName = '#number |system group|';
let g_systemGroupList = new Object();
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
	for(let i=0;i<g_namesPoses.length;++i){
		if(g_namesPoses[i].checked){
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
	//現在行を取得
	let curIndex = getCursorIndex();
	const indexMax = (g_namesPoses.length - 1);

	let objScrollTarget = null;

	function isHiddenRow(argCurIndex){
		let indexNo = g_namesPoses[argCurIndex].custIndexNo;
		return ((objScrollTarget = g_idx2O[indexNo].pObjScrollTarget).clientHeight<=0);
	}

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
		for(let i=0;i<g_namesPoses.length;++i){
			curIndex += addVal;
			if(curIndex<0){curIndex = indexMax;
			}else if(curIndex>indexMax){curIndex = 0;
			}
			if(!isHiddenRow(curIndex)){
				break;
			}
		};
	}

	//指定の位置までスクロール
	g_poseList.scrollTop = objScrollTarget.offsetTop - g_poseList.offsetTop;

	g_namesPoses[curIndex].checked = true;
	//アニメショーン情報の送信
	sendPlayAnimation(g_namesPoses[curIndex].custIndexNo);
}

function cssDisplay(argCssTag,argIsBlock){
	return '.' + argCssTag + ' {display: ' + ((argIsBlock) ? 'block' : 'none') + ';}';
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
//	削除したらtrueを返す
function delStyleSheet(argStyleId){
	let objStyle = document.getElementById(argStyleId);
	if(objStyle != null){
;					g_objHead.removeChild(objStyle);
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

		let nameIndex = getCursorIndex();
		if(nameIndex in g_namesPoses){
			curIndex = g_namesPoses[nameIndex].custIndexNo;
		}
	}
	sendPlayAnimation(curIndex);
}

function changeCreator(){
	const styleId = 'cssCreator';
	delStyleSheet(styleId);
	if(event.target.value == 'all'){return;}

	let strCss = '';
	for(let oneUuid in g_uuid2O){
		let cssTag = g_uuid2O[oneUuid].pCssTag;
		strCss += cssDisplay(cssTag,(event.target.value==cssTag));
	}

	addStyleElement(styleId,strCss);
}

function openCloseWaku(argTragetId=null,argChecked=null) {
	function dispFunc(argTarget){
		document.getElementById(argTarget.custId).style.display = (argTarget.checked)?'block':'none';
	}
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
function requestList(argDataType,argCreatorUuid,argCurrentIndex){

	let requestData = null;
	switch(argDataType){
	case g_dataTypeINIT	:
		requestData = g_dataTypeINIT;
		break;
	case g_dataTypeLIST	:
		requestData = g_dataTypeLIST + ',' + argCurrentIndex;
		break;
	case g_dataTypeCREATOR	:
		requestData = g_dataTypeCREATOR + ',' + argCreatorUuid;
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
				requestList(argDataType,argCreatorUuid,argCurrentIndex);
			}
		}
	);
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

		for(let oneUuid in g_uuid2O){
			let objCreator = g_uuid2O[oneUuid];
			if(objCreator.pDoRequest){
				//未解決の「UUID→名前」がある場合、要求を行い、関数を終了する。
				requestList(g_dataTypeCREATOR,oneUuid,0);
				return;
			}
		}

		if(g_currentIndex < g_totalCount){
			//ポーズリストの最後まで到達していない場合、要求を行い、関数を終了する。
			requestList(g_dataTypeLIST,null,g_currentIndex);
			return;
		}

		//データ全件受信完了

		//バリエーション情報を作成
		makeVariationInfo();

		//名前によるグルーピング
		makeNameGroup();
		//画面を作成する
		makeUI();
	}
}

//	argIndexNo	-1：停止を送信
//				0以降：in worldのコンテンツ内のポーズ番号
function sendPlayAnimation(argIndexNo){
	if(argIndexNo>=0){
		//再生情報
		if(! g_btnPlay.checked){
			//停止中なら送らない
			return;
		}
	}
	$.ajax(
		{
			'type': 'POST'
			,'url': location.href
			,'data' : 'CTRL,' + argIndexNo
		}
	).done(
		function(data) {
			//何もしない
		}
	).fail(
		function(data) {
			if (data.status == 504) {
				// timeout -> retry
				sendPlayAnimation(argIndexNo);
			}
		}
	);
}
function btnMini(){
	$.ajax(
		{
			'type': 'POST'
			,'url': location.href
			,'data' : 'MINI'
		}
	).done(
		function(data) {
			//何もしない
		}
	).fail(
		function(data) {
			if (data.status == 504) {
				// timeout -> retry
				sendPlayAnimation(argIndexNo);
			}
		}
	);
}

//JSON情報をオブジェクトに変更
//※argJsonDataは要素が１つでも配列構造で送られてくる
function makePoseInfo(argJsonData){
	if(argJsonData.dType==g_dataTypeCREATOR){
		//作者情報（名前）を処理する
		let creatorUuid = unescape(argJsonData.uuidEnc);
		let creatorName = unescape(argJsonData.nameEnc);
		let objCreator = g_uuid2O[creatorUuid];
		objCreator.pName = (unescape(creatorName)).replace(/ Resident$/,'');	//末尾の'Resident'を削除
		objCreator.pDoRequest = false;
		return 0;
	}

	//animation情報格納用のオブジェクト作成
	function makeObjPose(argIndexNo,argPoseName,argCreatorUuid) {
		if(!(argCreatorUuid in g_uuid2O)){
			//作者用cssタグの連番
			//ゼロ始まりの連番
			let creatorSeq = Object.keys(g_uuid2O).length;

			g_uuid2O[argCreatorUuid] = {
				 pNo : creatorSeq
				,pCssTag : 'css_creator_' + creatorSeq
				,pName : null
				,pDoRequest : true			//名前取得要求をすべきか
			}
		}
		let objCreator = g_uuid2O[argCreatorUuid];

		let objMe = {
				 pIndexNo : argIndexNo		//HUDのコンテンツ内の連番(0～
				,pName : argPoseName		//ポーズ名
				,pDisplayName : argPoseName	//表示用
				,pUuid : argCreatorUuid		//製作者UUID

				//バリエーション情報
				,pIsParent : false			//バリエーションが存在する
				,pVariationNameList : null	//バリエーションの名前リスト(ソート済)
				,pIsVariation : false		//これはバリエーション
				,pParentName : null			//親の名前	※バリエーションの場合、親のポーズ名が設定される
				,pVariationArea : null

				//HTML情報
				,pObjScrollTarget : null	//順送りボタンによる移動のためのスクロール先

				//名前によるグループ情報
				,pGroupInfo : null		//グループ情報
				,pIsGrouped : false		//このメンバーがグループに入ったか

				//製作者情報
				,pCreatorInfo : objCreator
			}
		return objMe;
	}

	//ポーズリスト（'|'区切り）を分割
	let poseListPsv = (argJsonData.poseList).split('|');

	let addCount = 0;
	for(let i=0;i<poseListPsv.length;i+=3){
		let psvIndex = poseListPsv[i];	//in worldのcontentsの連番（０～
		let psvName = unescape(poseListPsv[i+1]);	//ポーズ名
		let psvUuid = poseListPsv[i+2];	//製作者のUuid

		if ( psvIndex in g_idx2O ){
			//ありえないが同じデータがきたらスキップ
			continue;
		}

		++addCount;
		updateProgress();

		let objPose = makeObjPose(
							psvIndex
							,psvName
							,psvUuid
							);

		g_nm2O[objPose.pName] = objPose;
		g_idx2O[objPose.pIndexNo] = objPose;
	}
	return addCount;
}

//基本要素を作成する
function makeUI(){
	function makePartsLabel(argId,argClassTag,argText=null,argTitle=null){
		let objLabel = document.createElement('label');

		objLabel.htmlFor = argId;

		objLabel.className = 'csCmnLbl ' + argClassTag;

		if(argText!=null){
			objLabel.appendChild(document.createTextNode(argText));
		}

		if(argTitle!=null){
			objLabel.title = argTitle;
		}

		return objLabel;
	}

	function makePartsPoseName(argObjPose,argWakuType,argWakuClassTag,argLabelClassTag){
		//------------------------------
		//radioとラベルを囲む枠
		//------------------------------
		let objWaku = document.createElement(argWakuType);
		objWaku.className = argWakuClassTag;

		//------------------------------
		//アニメーション選択用のradioボタンとラベル
		//------------------------------
		let objRadio = document.createElement('input');
		objRadio.type = 'radio';
		objRadio.name = 'namesPoseList';
		objRadio.className = 'csPoseRdo';
		objRadio.id = 'rdo_'+argObjPose.pIndexNo;	//ラベルとの紐づけ用
		objRadio.custIndexNo = argObjPose.pIndexNo;
		objRadio.onchange = function(){sendPlayAnimation(event.target.custIndexNo);}
		objWaku.appendChild(objRadio);

		let objPoseLbl = makePartsLabel(objRadio.id,argLabelClassTag,argObjPose.pDisplayName,argObjPose.pName + ' / creator : ' + argObjPose.pCreatorInfo.pName);
		objWaku.appendChild(objPoseLbl);

		if(argObjPose.pIsParent){
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

	//------------------------------
	//グループ枠を先に作成する
	//------------------------------
	//システムグループが存在する場合、先に作成する
	for(let systemGroup in g_systemGroupList){
		let oneGroup = g_systemGroupList[systemGroup];
		if(oneGroup!=null){
			makeHigherGroup(oneGroup,true,g_poseList);
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
			objHigherIn = makeHigherGroup(oneGroup,true,g_poseList);
		}

		//通常のグループを作成する
		let addTarget = (objHigherIn == null)?g_poseList:objHigherIn;
		makeHigherGroup(oneGroup,false,addTarget);
	}

	//ポーズを作成する
	for(let i in g_idx2O){
		let objPose = g_idx2O[i];
		if(objPose.pIsVariation){
			//バリエーションは対象外
			continue;
		}

		//------------------------------
		//radioとラベルを囲む枠
		//------------------------------
		console.log(objPose.pName);
		let strGroupLbl = (objPose.pGroupInfo.pMemCount==1)?'csNoGroupLbl' + objPose.pGroupInfo.pLevel:'csInGroupLbl'
		let strClassName = 'csPoseLbl '+ strGroupLbl;
		let objWaku = makePartsPoseName(objPose,'div',objPose.pCreatorInfo.pCssTag,strClassName);
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
					let objVariationWaku = makePartsPoseName(objPoseVariation,'span','csVarOne','csVarLbl');

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
	for(let oneName of nameKeys){
		let objCreator = nameList[oneName];
		let opt = document.createElement('option');
		opt.text = objCreator.pName;
		opt.value = objCreator.pCssTag;
		objSelect.appendChild(opt);
	}

	g_namesPoses = document.getElementsByName('namesPoseList');

	//チェック状態に応じて初期状態にする
	openCloseWaku('btnGroup',false);
	openCloseWaku('btnVariation',false);

	delStyleSheet('cssLoading');

	//画面のリサイズはかからない前提
	g_poseList.style.height = (document.documentElement.clientHeight - g_poseList.offsetTop) + 'px';
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
function makeVariation(argPoseKeyList,argPoseNameList){
	const isPriorityRegExp = /^(.*)((?:P|Priority)[ _=\-]*\d)$/i;	//優先度っぽいか
	const wordSeparatorRegExp = /([^a-zA-Z_])/;				//単語と判断して区切らない文字列
	const allNumericRegExp = /^[\d#\. ]+$/;					//数字と判断

	function setVariarion(argObjVariation,argDispay,argParentName){
		let objPoseParent = g_nm2O[argParentName];

		if(objPoseParent.pIsVariation){
			//親に指定しようとしているものがバリエーションだった場合

			//親の親の名前を取得
			argParentName = objPoseParent.pParentName;

			if(argObjVariation.pName.startsWith(argParentName)){
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

				argDispay = (argObjVariation.pName.slice(argParentName.length)).trim();
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
		argObjVariation.pParentName = argParentName;

		//親にバリエーションの情報を設定する
		objPoseParent = g_nm2O[argParentName];
		if(objPoseParent.pVariationNameList==null){
			objPoseParent.pVariationNameList = new Object();
		}
		objPoseParent.pVariationNameList[argObjVariation.pName] = null;
	}

	//------------------------------
	//単語レベルに分解してバリエーション判定を行う
	//------------------------------
	function makeVariationByWord(argObjPoseBase,argObjPoseTarget){
		let poseNameBase   = argObjPoseBase.pName;
		let poseNameTarget = argObjPoseTarget.pName;

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

		if(diffstr.substr(0,1).match(allNumericRegExp)){
			//１桁目が数字なら抜ける
			return;
		}

		let objPoseVariation = argObjPoseTarget;
		let parentName = poseNameBase;

		if(poseNameBase.length > poseNameTarget.length){
			objPoseVariation = argObjPoseBase;
			parentName = poseNameTarget;
		}
		setVariarion(objPoseVariation,diffstr,parentName);
	}

	let bak2Keta = null;
	let objTargetList = null;
	for(let onePoseNameBaseKey of argPoseKeyList){
		let onePoseNameBase = argPoseNameList[onePoseNameBaseKey];
		let objPoseBase = g_nm2O[onePoseNameBase];
		let isWordsA = onePoseNameBase.match(wordSeparatorRegExp);
		let base2keta = onePoseNameBase.substr(0,2);

		if(bak2Keta != base2keta){
			//比較対象を減らすために
			//処理対象の先頭２桁が一致する配列を作成する
			objTargetList = new Object();;
			let isfound = false;
			for(let onePoseNameKey of argPoseKeyList){
				let onePoseName = argPoseNameList[onePoseNameKey];

				if(base2keta!=onePoseName.substr(0,2)){
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

					objTargetList[onePoseNameKey] = onePoseName;
				}
			}

			bak2Keta = base2keta;
		}

		//バリエーション未判定のものだけを対象にする
		for(let onePoseNameKey in objTargetList){
			let onePoseName = objTargetList[onePoseNameKey];
			if(onePoseNameBase==onePoseName){
				//比較元と比較先が完全一致する時は、処理しない
				continue;
			}

			let objPose = g_nm2O[onePoseName];

			if(onePoseName.startsWith(onePoseNameBase)){
				//ポーズ②の名前がポーズ①の名前から始まる
				//	①'aaaaaa'
				//	②'aaaaaaM'
				//	上記の場合、②は①のバリエーションと判断する

				let diffstr = (onePoseName.slice(onePoseNameBase.length)).trim();
				if(!diffstr.substr(0,1).match(allNumericRegExp)){
					setVariarion(objPose,diffstr,onePoseNameBase);
				}
			}else {
				let isPriority = false;
				if(onePoseNameBase.match(isPriorityRegExp) && onePoseName.match(isPriorityRegExp)){
					//優先度っぽい感じなら
					//優先度文字列を抜くと一致するかチェック
					let substredBase  = onePoseNameBase.replace(isPriorityRegExp,'$1');
					let substredTarget= onePoseName.replace(isPriorityRegExp,'$1');
					if(substredBase == substredTarget){
						let priorityBase  = onePoseNameBase.replace(isPriorityRegExp,'$2');
						let priorityTarget= onePoseName.replace(isPriorityRegExp,'$2');
						if(priorityBase<priorityTarget){
							//console.log('Priority:['+priorityBase+']['+onePoseNameBase+']['+priorityTarget+']['+onePoseName+']');
							setVariarion(objPose,priorityTarget,onePoseNameBase);
							isPriority = true;
						}else{
							//次の機会に処理されるだろう
						}
					}
				}

				if(! isPriority){
					if((isWordsA)&&(onePoseName.match(wordSeparatorRegExp))){
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

		makeVariation(poseKeys,poseList);
	}

	//------------------------------
	//バリエーション情報をソートして再設定する
	//------------------------------
	for(let i in g_idx2O){
		let objPose = g_idx2O[i];
		if(objPose.pIsParent){
			let poseList = objPose.pVariationNameList;
			let poseKeys = Object.keys(poseList);
			poseKeys.sort();

			objPose.pVariationNameList = poseKeys;
			//console.log('parent['+objPose.pName+']'+objPose.pVariationNameList);
		}
	}
}

//名前でグループ化する
function makeNameGroup(){
	//const delLastNumericRegExp = /^(.*[a-zA-Z])[^a-zA-Z]+$/;
	//最後の優先度を含んだ数字を削除
	//	'Aiko Animation 1 Priority 4'
	//		↓
	//	'Aiko Animation 1'
	const delPriorityRegExp = /^(.*[a-zA-Z][^a-zA-Z]+)[ ]*(P|Priority)[ ]*[^a-zA-Z]+$/;
	//最後の数字などを除去
	//	'STUN Anim - Malvene 1'
	//		↓
	//	'STUN Anim - Malvene'
	const delLastNumericRegExp = /^(.*[a-zA-Z])[^a-zA-Z]+$/;
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
	function compareName(argPoseA,argPoseB,argIsMarume=false){
		if(argPoseA==argPoseB){
			return argPoseA;	//２つの文字列は絶対異なるが念のため
		}
		let retString = '';
		let sameLen = 0;
		const wordSeparatorRegExp = /(\W)/;
		const allNumericRegExp = /^[\d#\. ]+$/;
		if(argPoseA.match(wordSeparatorRegExp)
			&& argPoseB.match(wordSeparatorRegExp)
			&& argPoseA.match(allNumericRegExp)
			&& argPoseB.match(allNumericRegExp)){
			//数値要素だけの文字列で
			//単語区切りができそうなら、単語区切りで比較する。

			//※以下を別のグループと認識できるようにするため
			//	'151.1'
			//	'159.1.1'
			let arrayA = argPoseA.split(wordSeparatorRegExp);
			let arrayB = argPoseB.split(wordSeparatorRegExp);
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
			let maxLen = Math.min(argPoseA.length,argPoseB.length);
			for(let len=2;len<=maxLen;++len){
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
			const objRegExp = /[^a-zA-Z]+/
			//差異部分の比較
			//　※同一視したい文字列を削除する
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

	//上の行・下の行での比較を行う。
	//同一作者かどうかは問わない
	let lastGroupName=null;
	let objPosePre = null;
	for(let i in g_idx2O){
		let objPose = g_idx2O[i];

		let poseName = objPose.pName;
		if(objPose.pIsVariation){
			//バリエーションは対象外
			continue;
		}
		let compName = poseName;
		compName = compName.replace(delPriorityRegExp,'$1');
		compName = compName.replace(delLastNumericRegExp,'$1');

		if(objPosePre!=null){
			let poseNamePre = objPosePre.pName;
			let compNamePre = poseNamePre;

			compNamePre = compNamePre.replace(delPriorityRegExp,'$1');
			compNamePre = compNamePre.replace(delLastNumericRegExp,'$1');

			let groupName = compareName(compNamePre,compName,false);
			if(groupName!=null){
				if(lastGroupName!=null){
					//ひとつ前に成立したグループ名と比較
					let unionGroupName = compareName(lastGroupName,compName,false);
					if(unionGroupName!=null){
						if(unionGroupName==lastGroupName){
							groupName = lastGroupName;
						}else {
							//前のグループ名と比較し、共通する部分がなければ
							//→別のグループとする
							groupName = null;
						}
					}else{
						//前に確定したグループと一致しない場合
						//→別のグループとする
						groupName = null;
					}
				}

				if(groupName != null){
					let objPoseList = new Object();

					if(!objPosePre.pIsGrouped){
						objPoseList[poseNamePre] = objPosePre.pName;
						objPosePre.pIsGrouped = true;
					}
					if(!objPose.pIsGrouped){
						objPoseList[poseName] = objPose.pName;
						objPose.pIsGrouped = true;
					}

					if(Object.keys(objPoseList).length>0){
						//グループに属するファイルが存在する場合
						if(!(groupName in objGroup)){
							objGroup[groupName] = makeNewGroup(objPoseList);
						}else{
							//既存であれば、ファイルリストをコピーする
							fullNameMove(groupName,null,false,objPoseList);
						}
					}
				}
			}
			lastGroupName = groupName;
		}
		objPosePre = objPose;
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

		let oneGroup = (objGroup[objPose.pName] = makeNewGroup(null));
		oneGroup.pPoseList[objPose.pName] = objPose.pName;
	}

	//==============================
	//グループ名の正規化
	//==============================
	for(let oneGroupName in objGroup){
		//末尾の不要な文字列を削除する
		//末尾の数字、空白
		let newGroupName = oneGroupName.replace(delLastNumericRegExp,'$1');
		if(!(newGroupName in objGroup)){
			objGroup[newGroupName] = makeNewGroup(null);
			fullNameMove(newGroupName,oneGroupName,true);
		}
	}

	//==============================
	//まとめられるグループの対応①
	//==============================
	//	まるめ後の比較
	let groupKeys = Object.keys(objGroup);
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
				fullNameMove(mergeGroupName,groupNamePre,true);
				fullNameMove(mergeGroupName,groupName,true);

				groupNamePre = mergeGroupName;
			}else{
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
			if(groupName.startsWith(groupNamePre)){

				fullNameMove(groupNamePre,groupName,true);

				groupName = groupNamePre;
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
			oneCreatorTag.pIsLevel = false;
			oneCreatorTag.pGroupNameList = new Object();
			oneCreatorTag.pHigerGroupNameList = null;
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
				oneCreatorTag.pIsLevel = false;
				oneCreatorTag.pGroupNameList = new Object();
				oneCreatorTag.pHigerGroupNameList = null;
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
		let oneCreatorGroup = objCreatorTagList[oneCreatorTag];

		//製作者ごとにグループ名のリストを作成する
		//	名前順に処理をする
		for(let groupName of groupKeys){
			let oneGroup = objGroup[groupName];
			if(oneGroup.pCssTag == oneCreatorTag){
				oneCreatorGroup.pGroupNameList[groupName] = groupName;
			}
		}

		if(Object.keys(oneCreatorGroup.pGroupNameList).length>1){
			//グループ名の共通部分をまとめる
			//	二周回して
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
			if(oneCreatorGroup.pHigerGroupNameList != null){
				for(let groupName in oneCreatorGroup.pGroupNameList){
					let oneGroup = objGroup[groupName];
					for(let higherGroupName in oneCreatorGroup.pHigerGroupNameList){
						let doSet = false;
						if(higherGroupName == g_numericGroupName){
							if(groupName.match(/^\d./)){
								doSet = true;
							}
						}else{
							if(groupName.startsWith(higherGroupName)){
								doSet = true;
							}
						}
						if(doSet){
							if(higherGroupName in g_systemGroupList){
								if(g_systemGroupList[higherGroupName]==null){
									g_systemGroupList[higherGroupName] = oneGroup;
								}
							}

							oneGroup.pHigherGroupId = 'idHigerGroup' + oneCreatorGroup.pHigerGroupNameList[higherGroupName];
							oneGroup.pHigherGroupInnerId = 'list' + oneGroup.pHigherGroupId;
							oneGroup.pHigherGroupName = higherGroupName;
							oneGroup.pLevel ++;
						}
					}
				}
			}
		}
	}

	//==============================
	//グループ情報を作成
	//==============================
	//・g_groupNamesを作成
	//・g_nm2OのpGroupInfoに反映
	//
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
		//console.log(groupName);
		g_groupNames[groupName] = oneGroup;

		//グループメンバーにも情報を設定する
		for(let oneFile in onePoseList){
			g_nm2O[oneFile].pGroupInfo = oneGroup;
		}
	}
}

function compareLowerCase(a, b) {
	a = a.toString().toLowerCase();
	b = b.toString().toLowerCase();
	return (a > b) ?  1 :((b > a) ? -1 : 0);
}

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

window.onload = function() {
//共通変数
g_objHead = document.getElementsByTagName('head').item(0);
g_poseList = document.getElementById('dPoseList');
g_selTimer = document.getElementById('selTimer');
g_btnPlay = document.getElementById('playBtn');
g_btnTimer = document.getElementById('timerOn');

//timerの間隔設定
const arrayTime = ([2,3,5,10,15,20,30,60,90,120]).sort((a, b) => a - b);
arrayTime.forEach(function(element){
		let opt = document.createElement('option');
		opt.text = (opt.value = element)+ ' sec';
		g_selTimer.appendChild(opt);
	});
g_selTimer.selectedIndex = 0;

//ここ以降は、初回のリクエスト送信
//debug	requestList(g_dataTypeINIT,null,0);

g_debugtId = setInterval(debugExecute,500);

};

function debugExecute(){
clearInterval(g_debugtId);
//ここからはローカルテスト用
//ajaxで送られてくるJSONの例
//アニメーション名：作者のUUID：コンテンツ内の連番（０始まり）
const sampleJSON = [
	 {"dType":"LIST","poseList":"0|%2D%20sc%20%2D%20calm|3f683453-d06e-4ded-8494-36f72e90aae1|1|%2D%20sc%20%2D%20dream|3f683453-d06e-4ded-8494-36f72e90aae1|2|%2D%20sc%20%2D%20honey%201|3f683453-d06e-4ded-8494-36f72e90aae1|3|%2D%20sc%20%2D%20honey%202|3f683453-d06e-4ded-8494-36f72e90aae1|4|%2D%20sc%20%2D%20honey%203|3f683453-d06e-4ded-8494-36f72e90aae1|5|%2D%20sc%20%2D%20honey%204|3f683453-d06e-4ded-8494-36f72e90aae1|6|%2D%20sc%20%2D%20honey%205|3f683453-d06e-4ded-8494-36f72e90aae1|7|%2D%20sc%20%2D%20quiet|3f683453-d06e-4ded-8494-36f72e90aae1|8|%2D%20sc%20%2D%20spacey|3f683453-d06e-4ded-8494-36f72e90aae1|9|%2D%20sc%20%2D%20zoned|3f683453-d06e-4ded-8494-36f72e90aae1|10|%2DXTC%2D%20Fever%201|12afbf23-8293-477b-8e48-180fd25da581|11|%2DXTC%2D%20Fever%201%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|12|%2DXTC%2D%20Fever%202|12afbf23-8293-477b-8e48-180fd25da581"}
	,{"dType":"CREATOR","nameEnc":"Alien%20Daddy","uuidEnc":"3f683453%2Dd06e%2D4ded%2D8494%2D36f72e90aae1"}
	,{"dType":"CREATOR","nameEnc":"PruKellar%20Resident","uuidEnc":"12afbf23%2D8293%2D477b%2D8e48%2D180fd25da581"}
	,{"dType":"LIST","poseList":"13|%2DXTC%2D%20Fever%202%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|14|%2DXTC%2D%20Fever%203|12afbf23-8293-477b-8e48-180fd25da581|15|%2DXTC%2D%20Fever%203%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|16|%2DXTC%2D%20Fever%204|12afbf23-8293-477b-8e48-180fd25da581|17|%2DXTC%2D%20Fever%204%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|18|%2DXTC%2D%20Fever%205|12afbf23-8293-477b-8e48-180fd25da581|19|%2DXTC%2D%20Fever%205%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|20|%2DXTC%2D%20Fever%206|12afbf23-8293-477b-8e48-180fd25da581|21|%2DXTC%2D%20Fever%206%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|22|%2DXTC%2D%20Girl%20Nextdoor%2D1|12afbf23-8293-477b-8e48-180fd25da581|23|%2DXTC%2D%20Girl%20Nextdoor%2D1%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|24|%2DXTC%2D%20Girl%20Nextdoor%2D2|12afbf23-8293-477b-8e48-180fd25da581"}
	,{"dType":"LIST","poseList":"25|%2DXTC%2D%20Girl%20Nextdoor%2D2%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|26|%2DXTC%2D%20Girl%20Nextdoor%2D3|12afbf23-8293-477b-8e48-180fd25da581|27|%2DXTC%2D%20Girl%20Nextdoor%2D3%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|28|%2DXTC%2D%20Girl%20Nextdoor%2D4|12afbf23-8293-477b-8e48-180fd25da581|29|%2DXTC%2D%20Girl%20Nextdoor%2D4%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|30|%2DXTC%2D%20Girl%20Nextdoor%2D5|12afbf23-8293-477b-8e48-180fd25da581|31|%2DXTC%2D%20Girl%20Nextdoor%2D5%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|32|%2DXTC%2D%20Girl%20Nextdoor%2D6|12afbf23-8293-477b-8e48-180fd25da581|33|%2DXTC%2D%20Girl%20Nextdoor%2D6%20%5BFlat%20Feet%5D|12afbf23-8293-477b-8e48-180fd25da581|34|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%201|5072e354-7349-4e32-bbab-6f6c2818d0b9"}
	,{"dType":"CREATOR","nameEnc":"Gabriella%20Corpur","uuidEnc":"5072e354%2D7349%2D4e32%2Dbbab%2D6f6c2818d0b9"}
	,{"dType":"LIST","poseList":"35|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%201%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|36|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%202|5072e354-7349-4e32-bbab-6f6c2818d0b9|37|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%202%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|38|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%203|5072e354-7349-4e32-bbab-6f6c2818d0b9|39|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%203%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|40|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%204|5072e354-7349-4e32-bbab-6f6c2818d0b9|41|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%204%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|42|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%205|5072e354-7349-4e32-bbab-6f6c2818d0b9"}
	,{"dType":"LIST","poseList":"43|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Kate%205%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|44|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%201|5072e354-7349-4e32-bbab-6f6c2818d0b9|45|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%201%20%5BMIrrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|46|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%202|5072e354-7349-4e32-bbab-6f6c2818d0b9|47|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%202%20%5BMIrrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|48|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%203|5072e354-7349-4e32-bbab-6f6c2818d0b9|49|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%203%20%5BMIrrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|50|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%204|5072e354-7349-4e32-bbab-6f6c2818d0b9"}
	,{"dType":"LIST","poseList":"51|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%204%20%5BMIrrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|52|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%205|5072e354-7349-4e32-bbab-6f6c2818d0b9|53|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%20%20Stella%205%20%5BMIrrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|54|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%201|5072e354-7349-4e32-bbab-6f6c2818d0b9|55|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%201%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|56|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%202|5072e354-7349-4e32-bbab-6f6c2818d0b9|57|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%202%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|58|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%203|5072e354-7349-4e32-bbab-6f6c2818d0b9"}
	,{"dType":"LIST","poseList":"59|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%203%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|60|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%204|5072e354-7349-4e32-bbab-6f6c2818d0b9|61|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%204%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|62|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%205|5072e354-7349-4e32-bbab-6f6c2818d0b9|63|%2E%2E%3A%3A%20Le%20Fleur%20%3A%3A%2E%2E%20Giselle%205%20%5BMirrored%5D|5072e354-7349-4e32-bbab-6f6c2818d0b9|64|66%20%231|ee61aafd-4029-43bd-a209-5f34859dd6cb|65|66%20%232|ee61aafd-4029-43bd-a209-5f34859dd6cb|66|66%20%233|ee61aafd-4029-43bd-a209-5f34859dd6cb|67|66%20%234|ee61aafd-4029-43bd-a209-5f34859dd6cb|68|66%20%235|ee61aafd-4029-43bd-a209-5f34859dd6cb|69|66%20%236|ee61aafd-4029-43bd-a209-5f34859dd6cb|70|66%20%237|ee61aafd-4029-43bd-a209-5f34859dd6cb"}
	,{"dType":"CREATOR","nameEnc":"NadySapa%20Resident","uuidEnc":"ee61aafd%2D4029%2D43bd%2Da209%2D5f34859dd6cb"}
	,{"dType":"LIST","poseList":"71|66%20%238|ee61aafd-4029-43bd-a209-5f34859dd6cb|72|66%20%239|ee61aafd-4029-43bd-a209-5f34859dd6cb|73|66%20%2310|ee61aafd-4029-43bd-a209-5f34859dd6cb|74|114%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|75|114%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|76|114%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|77|114%2E4|ee61aafd-4029-43bd-a209-5f34859dd6cb|78|114%2E5|ee61aafd-4029-43bd-a209-5f34859dd6cb|79|114%2E6|ee61aafd-4029-43bd-a209-5f34859dd6cb|80|114%2E7|ee61aafd-4029-43bd-a209-5f34859dd6cb|81|145%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|82|145%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|83|145%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|84|145%2E4|ee61aafd-4029-43bd-a209-5f34859dd6cb|85|145%2E5|ee61aafd-4029-43bd-a209-5f34859dd6cb|86|145%2E6%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|87|145%2E6%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|88|145%2E7|ee61aafd-4029-43bd-a209-5f34859dd6cb"}
	,{"dType":"LIST","poseList":"89|145%2E8|ee61aafd-4029-43bd-a209-5f34859dd6cb|90|145%2E9|ee61aafd-4029-43bd-a209-5f34859dd6cb|91|145%2E10%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|92|151%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|93|151%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|94|151%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|95|151%2E4|ee61aafd-4029-43bd-a209-5f34859dd6cb|96|151%2E5|ee61aafd-4029-43bd-a209-5f34859dd6cb|97|151%2E6|ee61aafd-4029-43bd-a209-5f34859dd6cb|98|151%2E7|ee61aafd-4029-43bd-a209-5f34859dd6cb|99|151%2E8|ee61aafd-4029-43bd-a209-5f34859dd6cb|100|151%2E9|ee61aafd-4029-43bd-a209-5f34859dd6cb|101|151%2E10|ee61aafd-4029-43bd-a209-5f34859dd6cb|102|151%2E11|ee61aafd-4029-43bd-a209-5f34859dd6cb|103|151%2E12|ee61aafd-4029-43bd-a209-5f34859dd6cb|104|151%2E13|ee61aafd-4029-43bd-a209-5f34859dd6cb|105|151%2E14|ee61aafd-4029-43bd-a209-5f34859dd6cb|106|151%2E15|ee61aafd-4029-43bd-a209-5f34859dd6cb"}
	,{"dType":"LIST","poseList":"107|151%2E16|ee61aafd-4029-43bd-a209-5f34859dd6cb|108|151%2E17|ee61aafd-4029-43bd-a209-5f34859dd6cb|109|158%2E1%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|110|158%2E1%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|111|158%2E1%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|112|158%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|113|158%2E3%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|114|158%2E3%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|115|158%2E3%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|116|158%2E3%2E4|ee61aafd-4029-43bd-a209-5f34859dd6cb|117|158%2E4%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|118|158%2E4%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|119|158%2E5%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|120|158%2E6|ee61aafd-4029-43bd-a209-5f34859dd6cb|121|158%2E7|ee61aafd-4029-43bd-a209-5f34859dd6cb|122|158%2E8%2E1fly|ee61aafd-4029-43bd-a209-5f34859dd6cb|123|158%2E9%2E1sit|ee61aafd-4029-43bd-a209-5f34859dd6cb"}
	,{"dType":"LIST","poseList":"124|158%2E10%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|125|158%2E10%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|126|158%2E10%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|127|158%2E11%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|128|158%2E11%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|129|158%2E12%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|130|158%2E12%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|131|159%2E1%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|132|159%2E1%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|133|159%2E2%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|134|159%2E2%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|135|159%2E3%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|136|159%2E3%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|137|159%2E4sit|ee61aafd-4029-43bd-a209-5f34859dd6cb|138|159%2E5%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|139|159%2E5%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb"}
	,{"dType":"LIST","poseList":"140|159%2E5%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|141|159%2E6fly|ee61aafd-4029-43bd-a209-5f34859dd6cb|142|159%2E7walk|ee61aafd-4029-43bd-a209-5f34859dd6cb|143|159%2E8%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|144|159%2E8%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|145|159%2E8%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|146|159%2E9%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|147|159%2E9%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|148|159%2E9%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|149|159%2E9%2E4|ee61aafd-4029-43bd-a209-5f34859dd6cb|150|159%2E10%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|151|159%2E10%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|152|159%2E10%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|153|163%2E1|ee61aafd-4029-43bd-a209-5f34859dd6cb|154|163%2E2|ee61aafd-4029-43bd-a209-5f34859dd6cb|155|163%2E3|ee61aafd-4029-43bd-a209-5f34859dd6cb|156|163%2E4|ee61aafd-4029-43bd-a209-5f34859dd6cb"}
	,{"dType":"LIST","poseList":"157|163%2E5|ee61aafd-4029-43bd-a209-5f34859dd6cb|158|163%2E6|ee61aafd-4029-43bd-a209-5f34859dd6cb|159|163%2E7|ee61aafd-4029-43bd-a209-5f34859dd6cb|160|163%2E8|ee61aafd-4029-43bd-a209-5f34859dd6cb|161|163%2E9|ee61aafd-4029-43bd-a209-5f34859dd6cb|162|163%2E10|ee61aafd-4029-43bd-a209-5f34859dd6cb|163|%3A%3AWetCat%3A%3A%20%22Frida%22%201%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|164|%3A%3AWetCat%3A%3A%20%22Frida%22%201%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|165|%3A%3AWetCat%3A%3A%20%22Frida%22%201C%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|166|%3A%3AWetCat%3A%3A%20%22Frida%22%201C%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|167|%3A%3AWetCat%3A%3A%20%22Frida%22%201v2%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|168|%3A%3AWetCat%3A%3A%20%22Frida%22%201v2%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2"}
	,{"dType":"CREATOR","nameEnc":"wetcat%20Flux","uuidEnc":"6e793f86%2Dd5df%2D4355%2D806e%2D240986e576e2"}
	,{"dType":"LIST","poseList":"169|%3A%3AWetCat%3A%3A%20%22Frida%22%202%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|170|%3A%3AWetCat%3A%3A%20%22Frida%22%202%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|171|%3A%3AWetCat%3A%3A%20%22Frida%22%202C%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|172|%3A%3AWetCat%3A%3A%20%22Frida%22%202C%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|173|%3A%3AWetCat%3A%3A%20%22Frida%22%203%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|174|%3A%3AWetCat%3A%3A%20%22Frida%22%203%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|175|%3A%3AWetCat%3A%3A%20%22Frida%22%203v2%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|176|%3A%3AWetCat%3A%3A%20%22Frida%22%203v2%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|177|%3A%3AWetCat%3A%3A%20%22Frida%22%204%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2"}
	,{"dType":"LIST","poseList":"178|%3A%3AWetCat%3A%3A%20%22Frida%22%204%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|179|%3A%3AWetCat%3A%3A%20%22Frida%22%205%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|180|%3A%3AWetCat%3A%3A%20%22Frida%22%205%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|181|%3A%3AWetCat%3A%3A%20%22Frida%22%206%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|182|%3A%3AWetCat%3A%3A%20%22Frida%22%206%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|183|%3A%3AWetCat%3A%3A%20%22Frida%22%206v2%20%5BBento%5D|0b45782a-e32d-421d-ac14-5394fa7bc57b|184|%3A%3AWetCat%3A%3A%20%22Frida%22%206v2%20Mir%20%5BBento%5D|6e793f86-d5df-4355-806e-240986e576e2|185|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%201|73936862-5330-47a5-8c9b-f6d71269acb4|186|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%201%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4"}
	,{"dType":"CREATOR","nameEnc":"Rie%20Silverfall","uuidEnc":"0b45782a%2De32d%2D421d%2Dac14%2D5394fa7bc57b"}
	,{"dType":"CREATOR","nameEnc":"LuaneMeo%20Resident","uuidEnc":"73936862%2D5330%2D47a5%2D8c9b%2Df6d71269acb4"}
	,{"dType":"LIST","poseList":"187|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%202|73936862-5330-47a5-8c9b-f6d71269acb4|188|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%202%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|189|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%203|73936862-5330-47a5-8c9b-f6d71269acb4|190|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%203%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|191|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%204|73936862-5330-47a5-8c9b-f6d71269acb4|192|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%204%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|193|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%205|73936862-5330-47a5-8c9b-f6d71269acb4|194|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%205%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4"}
	,{"dType":"LIST","poseList":"195|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%206|73936862-5330-47a5-8c9b-f6d71269acb4|196|%3ALW%3A%20Bento%20Poses%20%2D%20Versions%20of%20Me%20%2D%206%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|197|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%201|73936862-5330-47a5-8c9b-f6d71269acb4|198|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%201%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|199|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%202|73936862-5330-47a5-8c9b-f6d71269acb4|200|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%202%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|201|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%203|73936862-5330-47a5-8c9b-f6d71269acb4|202|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%203%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|203|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%204|73936862-5330-47a5-8c9b-f6d71269acb4"}
	,{"dType":"LIST","poseList":"204|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%204%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|205|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%205|73936862-5330-47a5-8c9b-f6d71269acb4|206|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%205%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|207|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%206|73936862-5330-47a5-8c9b-f6d71269acb4|208|%3ALW%3A%20Bento%20Poses%20LDoS%20%2D%206%2C%20mirror|73936862-5330-47a5-8c9b-f6d71269acb4|209|%5BKoKoLoReS%5D%20In%20motion%20001|89e5a98a-0600-4f80-9c6d-73e28e508f15|210|%5BKoKoLoReS%5D%20In%20motion%20001%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|211|%5BKoKoLoReS%5D%20In%20motion%20001%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|212|%5BKoKoLoReS%5D%20In%20motion%20001%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|213|%5BKoKoLoReS%5D%20In%20motion%20002|89e5a98a-0600-4f80-9c6d-73e28e508f15"}
	,{"dType":"CREATOR","nameEnc":"Leyla%20Flux","uuidEnc":"89e5a98a%2D0600%2D4f80%2D9c6d%2D73e28e508f15"}
	,{"dType":"LIST","poseList":"214|%5BKoKoLoReS%5D%20In%20motion%20002%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|215|%5BKoKoLoReS%5D%20In%20motion%20002%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|216|%5BKoKoLoReS%5D%20In%20motion%20002%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|217|%5BKoKoLoReS%5D%20In%20motion%20003|89e5a98a-0600-4f80-9c6d-73e28e508f15|218|%5BKoKoLoReS%5D%20In%20motion%20003%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|219|%5BKoKoLoReS%5D%20In%20motion%20003%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|220|%5BKoKoLoReS%5D%20In%20motion%20003%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|221|%5BKoKoLoReS%5D%20In%20motion%20004|89e5a98a-0600-4f80-9c6d-73e28e508f15|222|%5BKoKoLoReS%5D%20In%20motion%20004%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|223|%5BKoKoLoReS%5D%20In%20motion%20004%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|224|%5BKoKoLoReS%5D%20In%20motion%20004%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15"}
	,{"dType":"LIST","poseList":"225|%5BKoKoLoReS%5D%20In%20motion%20005|89e5a98a-0600-4f80-9c6d-73e28e508f15|226|%5BKoKoLoReS%5D%20In%20motion%20005%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|227|%5BKoKoLoReS%5D%20In%20motion%20005%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|228|%5BKoKoLoReS%5D%20In%20motion%20005%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|229|%5BKoKoLoReS%5D%20In%20motion%20006|89e5a98a-0600-4f80-9c6d-73e28e508f15|230|%5BKoKoLoReS%5D%20In%20motion%20006%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|231|%5BKoKoLoReS%5D%20In%20motion%20006%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|232|%5BKoKoLoReS%5D%20In%20motion%20006%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|233|%5BKoKoLoReS%5D%20In%20motion%20II%20%20001|89e5a98a-0600-4f80-9c6d-73e28e508f15|234|%5BKoKoLoReS%5D%20In%20motion%20II%20%20001%201|89e5a98a-0600-4f80-9c6d-73e28e508f15"}
	,{"dType":"LIST","poseList":"235|%5BKoKoLoReS%5D%20In%20motion%20II%20%20001%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|236|%5BKoKoLoReS%5D%20In%20motion%20II%20%20001%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|237|%5BKoKoLoReS%5D%20In%20motion%20II%20%20002|89e5a98a-0600-4f80-9c6d-73e28e508f15|238|%5BKoKoLoReS%5D%20In%20motion%20II%20%20002%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|239|%5BKoKoLoReS%5D%20In%20motion%20II%20%20002%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|240|%5BKoKoLoReS%5D%20In%20motion%20II%20%20002%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|241|%5BKoKoLoReS%5D%20In%20motion%20II%20%20003|89e5a98a-0600-4f80-9c6d-73e28e508f15|242|%5BKoKoLoReS%5D%20In%20motion%20II%20%20003%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|243|%5BKoKoLoReS%5D%20In%20motion%20II%20%20003%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|244|%5BKoKoLoReS%5D%20In%20motion%20II%20%20003%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15"}
	,{"dType":"LIST","poseList":"245|%5BKoKoLoReS%5D%20In%20motion%20II%20%20004|89e5a98a-0600-4f80-9c6d-73e28e508f15|246|%5BKoKoLoReS%5D%20In%20motion%20II%20%20004%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|247|%5BKoKoLoReS%5D%20In%20motion%20II%20%20004%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|248|%5BKoKoLoReS%5D%20In%20motion%20II%20%20004%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|249|%5BKoKoLoReS%5D%20In%20motion%20II%20%20005|89e5a98a-0600-4f80-9c6d-73e28e508f15|250|%5BKoKoLoReS%5D%20In%20motion%20II%20%20005%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|251|%5BKoKoLoReS%5D%20In%20motion%20II%20%20005%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|252|%5BKoKoLoReS%5D%20In%20motion%20II%20%20005%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|253|%5BKoKoLoReS%5D%20In%20motion%20II%20%20006|89e5a98a-0600-4f80-9c6d-73e28e508f15|254|%5BKoKoLoReS%5D%20In%20motion%20II%20%20006%201|89e5a98a-0600-4f80-9c6d-73e28e508f15"}
	,{"dType":"LIST","poseList":"255|%5BKoKoLoReS%5D%20In%20motion%20II%20%20006%5Fm|89e5a98a-0600-4f80-9c6d-73e28e508f15|256|%5BKoKoLoReS%5D%20In%20motion%20II%20%20006%5Fm%201|89e5a98a-0600-4f80-9c6d-73e28e508f15|257|Aiko%20Animation%201%20Priority%204|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|258|Aiko%20Animation%201%20Priority%205|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|259|Aiko%20Animation%202%20Priority%204|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|260|Aiko%20Animation%202%20Priority%205|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|261|Aiko%20Animation%203%20Priority%204|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|262|Aiko%20Animation%203%20Priority%205|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|263|Aishia%20Animation%201%20P%2D4|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|264|Aishia%20Animation%201%20P%2D5|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|265|Aishia%20Animation%202%20P%2D4|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e"}
	,{"dType":"CREATOR","nameEnc":"Maria1995uruguay%20Resident","uuidEnc":"0eb2bdd2%2Ddd0b%2D4ed4%2Da9ce%2D295e3017cb3e"}
	,{"dType":"LIST","poseList":"266|Aishia%20Animation%202%20P%2D5|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|267|Aishia%20Animation%203%20P%2D4|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|268|Aishia%20Animation%203%20P%2D5|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|269|Alana%5F59%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|270|Alana%5F60%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|271|Alana%5F61%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|272|Alana%5F62%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|273|Alana%5F63%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|274|Alana%5F64%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|275|Alana%5F65%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|276|Alana%5F66%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1"}
	,{"dType":"CREATOR","nameEnc":"JasonBodylanguage%20Resident","uuidEnc":"15d73ada%2Dce5e%2D4f65%2Db8c3%2Dd701098259a1"}
	,{"dType":"LIST","poseList":"277|Alana%5F67%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|278|Alana%5F68%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|279|Ana%20Poses%20%2D%20Amata%201|8c385ca7-d4b8-486a-9453-e95383b3f489|280|Ana%20Poses%20%2D%20Amata%202|8c385ca7-d4b8-486a-9453-e95383b3f489|281|Ana%20Poses%20%2D%20Amata%203|8c385ca7-d4b8-486a-9453-e95383b3f489|282|Ana%20Poses%20%2D%20Amata%203%5Fmouth%20open|8c385ca7-d4b8-486a-9453-e95383b3f489|283|Ana%20Poses%20%2D%20Amata%204|8c385ca7-d4b8-486a-9453-e95383b3f489|284|Ana%20Poses%20%2D%20Catania%201|8c385ca7-d4b8-486a-9453-e95383b3f489|285|Ana%20Poses%20%2D%20Catania%202|8c385ca7-d4b8-486a-9453-e95383b3f489|286|Ana%20Poses%20%2D%20Catania%203|8c385ca7-d4b8-486a-9453-e95383b3f489|287|Ana%20Poses%20%2D%20Catania%204|8c385ca7-d4b8-486a-9453-e95383b3f489|288|Ana%20Poses%20%2D%20Catania%205|8c385ca7-d4b8-486a-9453-e95383b3f489"}
	,{"dType":"CREATOR","nameEnc":"Fanny%20Finney","uuidEnc":"8c385ca7%2Dd4b8%2D486a%2D9453%2De95383b3f489"}
	,{"dType":"LIST","poseList":"289|Ana%20Poses%20%2D%20Fyn%201|8c385ca7-d4b8-486a-9453-e95383b3f489|290|Ana%20Poses%20%2D%20Fyn%202|8c385ca7-d4b8-486a-9453-e95383b3f489|291|Ana%20Poses%20%2D%20Fyn%203|8c385ca7-d4b8-486a-9453-e95383b3f489|292|Ana%20Poses%20%2D%20Fyn%204|8c385ca7-d4b8-486a-9453-e95383b3f489|293|Ana%20Poses%20%2D%20Fyn%205|8c385ca7-d4b8-486a-9453-e95383b3f489|294|Angie%5F25%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|295|Angie%5F26%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|296|Angie%5F27%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|297|Angie%5F28%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|298|Angie%5F29%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|299|Angie%5F30%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|300|Angie%5F31%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1"}
	,{"dType":"LIST","poseList":"301|Angie%5F32%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|302|Angie%5F33%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|303|Angie%5F34%5FBento%5FDance%5FMOVE%21|15d73ada-ce5e-4f65-b8c3-d701098259a1|304|babyboo%2E%20babe%2001|918c3489-4105-4a16-b67c-f99a8fc45c1b|305|babyboo%2E%20babe%2001m|918c3489-4105-4a16-b67c-f99a8fc45c1b|306|babyboo%2E%20babe%2002|918c3489-4105-4a16-b67c-f99a8fc45c1b|307|babyboo%2E%20babe%2002m|918c3489-4105-4a16-b67c-f99a8fc45c1b|308|babyboo%2E%20babe%2003|918c3489-4105-4a16-b67c-f99a8fc45c1b|309|babyboo%2E%20babe%2003m|918c3489-4105-4a16-b67c-f99a8fc45c1b|310|babyboo%2E%20barbi%2001|918c3489-4105-4a16-b67c-f99a8fc45c1b|311|babyboo%2E%20barbi%2001m|918c3489-4105-4a16-b67c-f99a8fc45c1b|312|babyboo%2E%20barbi%2002|918c3489-4105-4a16-b67c-f99a8fc45c1b|313|babyboo%2E%20barbi%2002m|918c3489-4105-4a16-b67c-f99a8fc45c1b"}
	,{"dType":"CREATOR","nameEnc":"Baby%20Vanilla","uuidEnc":"918c3489%2D4105%2D4a16%2Db67c%2Df99a8fc45c1b"}
	,{"dType":"LIST","poseList":"314|babyboo%2E%20barbi%2003|918c3489-4105-4a16-b67c-f99a8fc45c1b|315|babyboo%2E%20barbi%2003m|918c3489-4105-4a16-b67c-f99a8fc45c1b|316|babyboo%2E%20barbi%2004|918c3489-4105-4a16-b67c-f99a8fc45c1b|317|babyboo%2E%20barbi%2004m|918c3489-4105-4a16-b67c-f99a8fc45c1b|318|babyboo%2E%20barbi%2005|918c3489-4105-4a16-b67c-f99a8fc45c1b|319|babyboo%2E%20barbi%2005m|918c3489-4105-4a16-b67c-f99a8fc45c1b|320|babyboo%2E%20barbi%2006|918c3489-4105-4a16-b67c-f99a8fc45c1b|321|babyboo%2E%20barbi%2006m|918c3489-4105-4a16-b67c-f99a8fc45c1b|322|babyboo%2E%20cynthia%2001|918c3489-4105-4a16-b67c-f99a8fc45c1b|323|babyboo%2E%20cynthia%2001%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|324|babyboo%2E%20cynthia%2001m|918c3489-4105-4a16-b67c-f99a8fc45c1b|325|babyboo%2E%20cynthia%2001m%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|326|babyboo%2E%20cynthia%2002|918c3489-4105-4a16-b67c-f99a8fc45c1b"}
	,{"dType":"LIST","poseList":"327|babyboo%2E%20cynthia%2002%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|328|babyboo%2E%20cynthia%2002m|918c3489-4105-4a16-b67c-f99a8fc45c1b|329|babyboo%2E%20cynthia%2002m%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|330|babyboo%2E%20cynthia%2003|918c3489-4105-4a16-b67c-f99a8fc45c1b|331|babyboo%2E%20cynthia%2003%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|332|babyboo%2E%20cynthia%2003m|918c3489-4105-4a16-b67c-f99a8fc45c1b|333|babyboo%2E%20cynthia%2003m%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|334|babyboo%2E%20cynthia%2004|918c3489-4105-4a16-b67c-f99a8fc45c1b|335|babyboo%2E%20cynthia%2004%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|336|babyboo%2E%20cynthia%2004m|918c3489-4105-4a16-b67c-f99a8fc45c1b|337|babyboo%2E%20cynthia%2004m%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b"}
	,{"dType":"LIST","poseList":"338|babyboo%2E%20cynthia%2005|918c3489-4105-4a16-b67c-f99a8fc45c1b|339|babyboo%2E%20cynthia%2005%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|340|babyboo%2E%20cynthia%2005m|918c3489-4105-4a16-b67c-f99a8fc45c1b|341|babyboo%2E%20cynthia%2005m%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|342|babyboo%2E%20cynthia%2006|918c3489-4105-4a16-b67c-f99a8fc45c1b|343|babyboo%2E%20diem%2001|918c3489-4105-4a16-b67c-f99a8fc45c1b|344|babyboo%2E%20diem%2001%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|345|babyboo%2E%20diem%2001m|918c3489-4105-4a16-b67c-f99a8fc45c1b|346|babyboo%2E%20diem%2002|918c3489-4105-4a16-b67c-f99a8fc45c1b|347|babyboo%2E%20diem%2002%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|348|babyboo%2E%20diem%2002m|918c3489-4105-4a16-b67c-f99a8fc45c1b|349|babyboo%2E%20diem%2003|918c3489-4105-4a16-b67c-f99a8fc45c1b"}
	,{"dType":"LIST","poseList":"350|babyboo%2E%20diem%2003%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|351|babyboo%2E%20diem%2003m|918c3489-4105-4a16-b67c-f99a8fc45c1b|352|babyboo%2E%20diem%2004|918c3489-4105-4a16-b67c-f99a8fc45c1b|353|babyboo%2E%20diem%2004%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|354|babyboo%2E%20diem%2004m|918c3489-4105-4a16-b67c-f99a8fc45c1b|355|babyboo%2E%20diem%2005|918c3489-4105-4a16-b67c-f99a8fc45c1b|356|babyboo%2E%20diem%2005%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|357|babyboo%2E%20diem%2005m|918c3489-4105-4a16-b67c-f99a8fc45c1b|358|babyboo%2E%20diem%2006|918c3489-4105-4a16-b67c-f99a8fc45c1b|359|babyboo%2E%20diem%2006%20%28breathing%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|360|babyboo%2E%20diem%2006m|918c3489-4105-4a16-b67c-f99a8fc45c1b|361|babyboo%2E%20honey%2001|918c3489-4105-4a16-b67c-f99a8fc45c1b"}
	,{"dType":"LIST","poseList":"362|babyboo%2E%20honey%2001m|918c3489-4105-4a16-b67c-f99a8fc45c1b|363|babyboo%2E%20honey%2002|918c3489-4105-4a16-b67c-f99a8fc45c1b|364|babyboo%2E%20honey%2002m|918c3489-4105-4a16-b67c-f99a8fc45c1b|365|babyboo%2E%20honey%2003|918c3489-4105-4a16-b67c-f99a8fc45c1b|366|babyboo%2E%20honey%2003m|918c3489-4105-4a16-b67c-f99a8fc45c1b|367|babyboo%2E%20honey%2004|918c3489-4105-4a16-b67c-f99a8fc45c1b|368|babyboo%2E%20honey%2004m|918c3489-4105-4a16-b67c-f99a8fc45c1b|369|babyboo%2E%20honey%2005|918c3489-4105-4a16-b67c-f99a8fc45c1b|370|babyboo%2E%20honey%2005%20%28alt%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|371|babyboo%2E%20honey%2005m|918c3489-4105-4a16-b67c-f99a8fc45c1b|372|babyboo%2E%20honey%2005m%20%28alt%29|918c3489-4105-4a16-b67c-f99a8fc45c1b|373|babyboo%2E%20honey%2006|918c3489-4105-4a16-b67c-f99a8fc45c1b|374|babyboo%2E%20honey%2006m|918c3489-4105-4a16-b67c-f99a8fc45c1b"}
	,{"dType":"LIST","poseList":"375|Bea%20Pose%201%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|376|Bea%20Pose%201%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|377|Bea%20Pose%201M%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|378|Bea%20Pose%201M%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|379|Bea%20Pose%202%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|380|Bea%20Pose%202%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|381|Bea%20Pose%202M%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|382|Bea%20Pose%202M%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|383|Bea%20Pose%203%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|384|Bea%20Pose%203%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|385|Bea%20Pose%203M%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e"}
	,{"dType":"LIST","poseList":"386|Bea%20Pose%203M%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|387|Bea%20Pose%204%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|388|Bea%20Pose%204%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|389|Bea%20Pose%204M%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|390|Bea%20Pose%204M%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|391|Bea%20Pose%205%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|392|Bea%20Pose%205%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|393|Bea%20Pose%205M%20Breathing|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|394|Bea%20Pose%205M%20Breathing%20%2B%20Hands|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|395|BERAS%20%2D%20Deja%201|0175ffcc-4029-4ef4-ba2f-634d03495e82|396|BERAS%20%2D%20Deja%202|0175ffcc-4029-4ef4-ba2f-634d03495e82|397|BERAS%20%2D%20Deja%203|0175ffcc-4029-4ef4-ba2f-634d03495e82"}
	,{"dType":"CREATOR","nameEnc":"Bifu%20Szondi","uuidEnc":"0175ffcc%2D4029%2D4ef4%2Dba2f%2D634d03495e82"}
	,{"dType":"LIST","poseList":"398|BERAS%20%2D%20Deja%203%20v2|0175ffcc-4029-4ef4-ba2f-634d03495e82|399|BERAS%20%2D%20Deja%204|0175ffcc-4029-4ef4-ba2f-634d03495e82|400|BERAS%20%2D%20Emma%201|0175ffcc-4029-4ef4-ba2f-634d03495e82|401|BERAS%20%2D%20Emma%202|0175ffcc-4029-4ef4-ba2f-634d03495e82|402|BERAS%20%2D%20Emma%203|0175ffcc-4029-4ef4-ba2f-634d03495e82|403|BERAS%20%2D%20Emma%204|0175ffcc-4029-4ef4-ba2f-634d03495e82|404|BERAS%20%2D%20Mia%201|0175ffcc-4029-4ef4-ba2f-634d03495e82|405|BERAS%20%2D%20Mia%201%20v2|0175ffcc-4029-4ef4-ba2f-634d03495e82|406|BERAS%20%2D%20Mia%202|0175ffcc-4029-4ef4-ba2f-634d03495e82|407|BERAS%20%2D%20Mia%202%20v2|0175ffcc-4029-4ef4-ba2f-634d03495e82|408|BERAS%20%2D%20Mia%203|0175ffcc-4029-4ef4-ba2f-634d03495e82|409|BERAS%20%2D%20Mia%204|0175ffcc-4029-4ef4-ba2f-634d03495e82|410|BERAS%20%2D%20Mia%204%20v2|0175ffcc-4029-4ef4-ba2f-634d03495e82"}
	,{"dType":"LIST","poseList":"411|BLAOatpCrouching01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|412|BLAOatpCrouchingWalk01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|413|BLAOatpFall01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|414|BLAOatpFly01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|415|BLAOatpFlyDown01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|416|BLAOatpFlyUp01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|417|BLAOatpGSit01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|418|BLAOatpGSit02%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|419|BLAOatpGSit03%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|420|BLAOatpHover01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|421|BLAOatpJump01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|422|BLAOatpLand01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|423|BLAOatpPreJump01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|424|BLAOatpRun01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23"}
	,{"dType":"CREATOR","nameEnc":"manmoth%20Nishi","uuidEnc":"c2bb6076%2D4560%2D4d59%2Da16e%2D1ca404fd4d23"}
	,{"dType":"LIST","poseList":"425|BLAOatpSit01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|426|BLAOatpSit02%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|427|BLAOatpSit03%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|428|BLAOatpSt01%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|429|BLAOatpSt02%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|430|BLAOatpSt03%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|431|BLAOatpSt04%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|432|BLAOatpSt05%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|433|BLAOatpSt06%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|434|BLAOatpSt07%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|435|BLAOatpSt08%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|436|BLAOatpSt09%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|437|BLAOatpSt10%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|438|BLAOatpSt11%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|439|BLAOatpStandUp01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23"}
	,{"dType":"LIST","poseList":"440|BLAOatpTurnL01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|441|BLAOatpTurnR01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|442|BLAOatpWalk01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|443|BLAOatpWalk02%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|444|BLAOatpWalk03%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|445|BLAOatpWalk04%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|446|BLAOwstCrouching01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|447|BLAOwstCrouchingWalk01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|448|BLAOwstFall01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|449|BLAOwstFly01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|450|BLAOwstFlyDown01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|451|BLAOwstFlyUp01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|452|BLAOwstGSit01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|453|BLAOwstGSit02%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23"}
	,{"dType":"LIST","poseList":"454|BLAOwstGSit03%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|455|BLAOwstHover01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|456|BLAOwstJump01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|457|BLAOwstLand01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|458|BLAOwstPreJump01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|459|BLAOwstRun01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|460|BLAOwstSit01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|461|BLAOwstSit02%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|462|BLAOwstSit03%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|463|BLAOwstSt01%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|464|BLAOwstSt02%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|465|BLAOwstSt03%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|466|BLAOwstSt04%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|467|BLAOwstSt05%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|468|BLAOwstSt06%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23"}
	,{"dType":"LIST","poseList":"469|BLAOwstSt07%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|470|BLAOwstSt08%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|471|BLAOwstSt09%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|472|BLAOwstSt10%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|473|BLAOwstSt11%5F3|c2bb6076-4560-4d59-a16e-1ca404fd4d23|474|BLAOwstStandUp01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|475|BLAOwstTurnL01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|476|BLAOwstTurnR01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|477|BLAOwstWalk01%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|478|BLAOwstWalk02%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|479|BLAOwstWalk03%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|480|BLAOwstWalk04%5F4|c2bb6076-4560-4d59-a16e-1ca404fd4d23|481|Bona%20Pose%201|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|482|Bona%20Pose%201m|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|483|Bona%20Pose%202|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e"}
	,{"dType":"LIST","poseList":"484|Bona%20Pose%202m|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|485|Bona%20Pose%203|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|486|Bona%20Pose%203m|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|487|Bona%20Pose%204|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|488|Bona%20Pose%204m|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|489|Bona%20Pose%205|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|490|Bona%20Pose%205m|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|491|Bona%20Pose%20Curvy%201|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|492|Bona%20Pose%20Curvy%201m|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|493|Bona%20Pose%20Curvy%205|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|494|Bona%20Pose%20Curvy%205m|0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e|495|CHICQRO%3A%20Erotic%20Dreams%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2001|b06318a0-cc68-49cc-952a-28dc7329da37"}
	,{"dType":"CREATOR","nameEnc":"emmyleitao%20Resident","uuidEnc":"b06318a0%2Dcc68%2D49cc%2D952a%2D28dc7329da37"}
	,{"dType":"LIST","poseList":"496|CHICQRO%3A%20Erotic%20Dreams%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2002|b06318a0-cc68-49cc-952a-28dc7329da37|497|CHICQRO%3A%20Erotic%20Dreams%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2003|b06318a0-cc68-49cc-952a-28dc7329da37|498|CHICQRO%3A%20Erotic%20Dreams%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2004|b06318a0-cc68-49cc-952a-28dc7329da37|499|CHICQRO%3A%20Erotic%20Dreams%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2005|b06318a0-cc68-49cc-952a-28dc7329da37|500|CHICQRO%3A%20Submissive%20Female%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2001|b06318a0-cc68-49cc-952a-28dc7329da37|501|CHICQRO%3A%20Submissive%20Female%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2002|b06318a0-cc68-49cc-952a-28dc7329da37|502|CHICQRO%3A%20Submissive%20Female%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2003|b06318a0-cc68-49cc-952a-28dc7329da37"}
	,{"dType":"LIST","poseList":"503|CHICQRO%3A%20Submissive%20Female%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2004|b06318a0-cc68-49cc-952a-28dc7329da37|504|CHICQRO%3A%20Submissive%20Female%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2005|b06318a0-cc68-49cc-952a-28dc7329da37|505|CHICQRO%3A%20Submissive%20Female%20%2D%20Bento%20Pose%20Pack%2001%20%2D%20Pose%2006|b06318a0-cc68-49cc-952a-28dc7329da37|506|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%201|778c136d-0f77-4e5a-af7b-abd9c14d365f|507|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%201M|778c136d-0f77-4e5a-af7b-abd9c14d365f|508|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%202|778c136d-0f77-4e5a-af7b-abd9c14d365f|509|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%202M|778c136d-0f77-4e5a-af7b-abd9c14d365f|510|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%203|778c136d-0f77-4e5a-af7b-abd9c14d365f"}
	,{"dType":"CREATOR","nameEnc":"Rina%20Edenflower","uuidEnc":"778c136d%2D0f77%2D4e5a%2Daf7b%2Dabd9c14d365f"}
	,{"dType":"LIST","poseList":"511|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%203M|778c136d-0f77-4e5a-af7b-abd9c14d365f|512|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%204|778c136d-0f77-4e5a-af7b-abd9c14d365f|513|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%204M|778c136d-0f77-4e5a-af7b-abd9c14d365f|514|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%205|778c136d-0f77-4e5a-af7b-abd9c14d365f|515|Diversion%20%2D%20%20Against%20All%20Odds%20%2D%205M|778c136d-0f77-4e5a-af7b-abd9c14d365f|516|Diversion%20%2D%20Cozy%20Fall%20%2D%201|778c136d-0f77-4e5a-af7b-abd9c14d365f|517|Diversion%20%2D%20Cozy%20Fall%20%2D%201M|778c136d-0f77-4e5a-af7b-abd9c14d365f|518|Diversion%20%2D%20Cozy%20Fall%20%2D%202|778c136d-0f77-4e5a-af7b-abd9c14d365f|519|Diversion%20%2D%20Cozy%20Fall%20%2D%202M|778c136d-0f77-4e5a-af7b-abd9c14d365f|520|Diversion%20%2D%20Cozy%20Fall%20%2D%203|778c136d-0f77-4e5a-af7b-abd9c14d365f"}
	,{"dType":"LIST","poseList":"521|Diversion%20%2D%20Cozy%20Fall%20%2D%203M|778c136d-0f77-4e5a-af7b-abd9c14d365f|522|Diversion%20%2D%20Cozy%20Fall%20%2D%204|778c136d-0f77-4e5a-af7b-abd9c14d365f|523|Diversion%20%2D%20Cozy%20Fall%20%2D%204M|778c136d-0f77-4e5a-af7b-abd9c14d365f|524|Diversion%20%2D%20Cozy%20Fall%20%2D%205|778c136d-0f77-4e5a-af7b-abd9c14d365f|525|Diversion%20%2D%20Cozy%20Fall%20%2D%205M|778c136d-0f77-4e5a-af7b-abd9c14d365f|526|Diversion%20%2D%20Cozy%20Fall%20%2D%206|778c136d-0f77-4e5a-af7b-abd9c14d365f|527|Diversion%20%2D%20Cozy%20Fall%20%2D%206M|778c136d-0f77-4e5a-af7b-abd9c14d365f|528|Diversion%20%2D%20Cozy%20Fall%20%2D%207|778c136d-0f77-4e5a-af7b-abd9c14d365f|529|Diversion%20%2D%20Cozy%20Fall%20%2D%207M|778c136d-0f77-4e5a-af7b-abd9c14d365f|530|Diversion%20%2D%20Ice%20Maiden%20%2D%201|778c136d-0f77-4e5a-af7b-abd9c14d365f|531|Diversion%20%2D%20Ice%20Maiden%20%2D%201M|778c136d-0f77-4e5a-af7b-abd9c14d365f"}
	,{"dType":"LIST","poseList":"532|Diversion%20%2D%20Ice%20Maiden%20%2D%202|778c136d-0f77-4e5a-af7b-abd9c14d365f|533|Diversion%20%2D%20Ice%20Maiden%20%2D%202M|778c136d-0f77-4e5a-af7b-abd9c14d365f|534|Diversion%20%2D%20Ice%20Maiden%20%2D%203|778c136d-0f77-4e5a-af7b-abd9c14d365f|535|Diversion%20%2D%20Ice%20Maiden%20%2D%203M|778c136d-0f77-4e5a-af7b-abd9c14d365f|536|Diversion%20%2D%20Ice%20Maiden%20%2D%204|778c136d-0f77-4e5a-af7b-abd9c14d365f|537|Diversion%20%2D%20Ice%20Maiden%20%2D%204M|778c136d-0f77-4e5a-af7b-abd9c14d365f|538|Diversion%20%2D%20Ice%20Maiden%20%2D%205|778c136d-0f77-4e5a-af7b-abd9c14d365f|539|Diversion%20%2D%20Ice%20Maiden%20%2D%205M|778c136d-0f77-4e5a-af7b-abd9c14d365f|540|Diversion%20%2D%20Ice%20Maiden%20%2D%206|778c136d-0f77-4e5a-af7b-abd9c14d365f|541|Diversion%20%2D%20Ice%20Maiden%20%2D%206M|778c136d-0f77-4e5a-af7b-abd9c14d365f"}
	,{"dType":"LIST","poseList":"542|Diversion%20%2D%20Ice%20Maiden%20%2D%207|778c136d-0f77-4e5a-af7b-abd9c14d365f|543|Diversion%20%2D%20Ice%20Maiden%20%2D%207M|778c136d-0f77-4e5a-af7b-abd9c14d365f|544|Diversion%20%2D%20Inner%20Chi%20%2D%201|778c136d-0f77-4e5a-af7b-abd9c14d365f|545|Diversion%20%2D%20Inner%20Chi%20%2D%201%20%28Ballerina%29|778c136d-0f77-4e5a-af7b-abd9c14d365f|546|Diversion%20%2D%20Inner%20Chi%20%2D%201M|778c136d-0f77-4e5a-af7b-abd9c14d365f|547|Diversion%20%2D%20Inner%20Chi%20%2D%201M%20%28Ballerina%29|778c136d-0f77-4e5a-af7b-abd9c14d365f|548|Diversion%20%2D%20Inner%20Chi%20%2D%202|778c136d-0f77-4e5a-af7b-abd9c14d365f|549|Diversion%20%2D%20Inner%20Chi%20%2D%202M|778c136d-0f77-4e5a-af7b-abd9c14d365f|550|Diversion%20%2D%20Inner%20Chi%20%2D%203|778c136d-0f77-4e5a-af7b-abd9c14d365f|551|Diversion%20%2D%20Inner%20Chi%20%2D%203M|778c136d-0f77-4e5a-af7b-abd9c14d365f"}
	,{"dType":"LIST","poseList":"552|Diversion%20%2D%20Inner%20Chi%20%2D%204|778c136d-0f77-4e5a-af7b-abd9c14d365f|553|Diversion%20%2D%20Inner%20Chi%20%2D%204M|778c136d-0f77-4e5a-af7b-abd9c14d365f|554|Diversion%20%2D%20Inner%20Chi%20%2D%205|778c136d-0f77-4e5a-af7b-abd9c14d365f|555|Diversion%20%2D%20Inner%20Chi%20%2D%205M|778c136d-0f77-4e5a-af7b-abd9c14d365f|556|Diversion%20%2D%20Inner%20Chi%20%2D%206|778c136d-0f77-4e5a-af7b-abd9c14d365f|557|Diversion%20%2D%20Inner%20Chi%20%2D%206M|778c136d-0f77-4e5a-af7b-abd9c14d365f|558|Kokoro%20%2D%20Eva%201|799ab241-da04-41bd-92ec-257e34f0c3dd|559|Kokoro%20%2D%20Eva%201%20%28Mirror%29|799ab241-da04-41bd-92ec-257e34f0c3dd|560|Kokoro%20%2D%20Eva%202|799ab241-da04-41bd-92ec-257e34f0c3dd|561|Kokoro%20%2D%20Eva%202%20%28Mirror%29|799ab241-da04-41bd-92ec-257e34f0c3dd|562|Kokoro%20%2D%20Eva%203|799ab241-da04-41bd-92ec-257e34f0c3dd"}
	,{"dType":"CREATOR","nameEnc":"Kokoro%20Kiyori","uuidEnc":"799ab241%2Dda04%2D41bd%2D92ec%2D257e34f0c3dd"}
	,{"dType":"LIST","poseList":"563|Kokoro%20%2D%20Eva%203%20%28Mirror%29|799ab241-da04-41bd-92ec-257e34f0c3dd|564|Kokoro%20%2D%20Eva%204%20%28Mirror%29%20%2D%20Exclusive%20Fatpack|799ab241-da04-41bd-92ec-257e34f0c3dd|565|Kokoro%20%2D%20Eva%204%20%2D%20Exclusive%20Fatpack|799ab241-da04-41bd-92ec-257e34f0c3dd|566|Kokoro%20%2D%20Eva%205%20%28Mirror%29%20%2D%20Bonus%20Surprise|799ab241-da04-41bd-92ec-257e34f0c3dd|567|Kokoro%20%2D%20Eva%205%20%2D%20Bonus%20Surprise|799ab241-da04-41bd-92ec-257e34f0c3dd|568|Kokoro%20%2D%20Eva%206|799ab241-da04-41bd-92ec-257e34f0c3dd|569|Kokoro%20%2D%20Eva%206%20%28Mirror%29|799ab241-da04-41bd-92ec-257e34f0c3dd|570|Kokoro%20%2D%20Sookie%201|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|571|Kokoro%20%2D%20Sookie%201%20%28mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|572|Kokoro%20%2D%20Sookie%202|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b"}
	,{"dType":"CREATOR","nameEnc":"AyraEdring%20Resident","uuidEnc":"9893564e%2Dddd2%2D4ddc%2Dbbdc%2D1dbdf8ecef6b"}
	,{"dType":"LIST","poseList":"573|Kokoro%20%2D%20Sookie%202%20%28mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|574|Kokoro%20%2D%20Sookie%203|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|575|Kokoro%20%2D%20Sookie%203%20%28mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|576|Kokoro%20%2D%20Sookie%204|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|577|Kokoro%20%2D%20Sookie%204%20%28mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|578|Kokoro%20%2D%20Sookie%205|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|579|Kokoro%20%2D%20Sookie%205%20%28mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|580|Kokoro%20%2D%20Sookie%206|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|581|Kokoro%20%2D%20Sookie%206%20%28mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|582|Kokoro%20Poses%20%2DUlyana%201|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|583|Kokoro%20Poses%20%2DUlyana%201%20%28Mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b"}
	,{"dType":"LIST","poseList":"584|Kokoro%20Poses%20%2DUlyana%202|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|585|Kokoro%20Poses%20%2DUlyana%202%20%28Mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|586|Kokoro%20Poses%20%2DUlyana%203%20%2FMirror|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|587|Kokoro%20Poses%20%2DUlyana%204%20%28Mirror%29%20%2D%20Bonus%20Surprise|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|588|Kokoro%20Poses%20%2DUlyana%204%20%2D%20Bonus%20Surprise|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|589|Kokoro%20Poses%20%2DUlyana%205|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|590|Kokoro%20Poses%20%2DUlyana%205%20%28Mirror%29|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|591|Kokoro%20Poses%20%2DUlyana%206%20%28Mirror%29%20%2D%20Exclusive%20Fatpack|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b|592|Kokoro%20Poses%20%2DUlyana%206%20%2D%20Exclusive%20Fatpack|9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b"}
	,{"dType":"LIST","poseList":"593|KZ%20poses%20%2D%201%20Gems%20%2D%20Female%20pose|913e4f4a-1ee2-442c-8661-957fe130c6ff|594|KZ%20poses%20%2D%201%20Sizzle%20%2D%20Female%20pose|913e4f4a-1ee2-442c-8661-957fe130c6ff|595|KZ%20poses%20%2D%202%20Gems%20%2D%20Female%20pose|913e4f4a-1ee2-442c-8661-957fe130c6ff|596|KZ%20poses%20%2D%202%20Sizzle%20%2D%20Female%20pose|913e4f4a-1ee2-442c-8661-957fe130c6ff|597|Le%20Poppycock%2DA%20light%20touch|6011417b-6905-4861-8ced-e23e79f6f311|598|Le%20Poppycock%2DBreath%20of%20Life|6011417b-6905-4861-8ced-e23e79f6f311|599|Le%20Poppycock%2DClean%20lines|6011417b-6905-4861-8ced-e23e79f6f311|600|Le%20Poppycock%2DDearest|6011417b-6905-4861-8ced-e23e79f6f311|601|Le%20Poppycock%2DDelicate%20shadings|6011417b-6905-4861-8ced-e23e79f6f311|602|Le%20Poppycock%2DExposed%20roots|6011417b-6905-4861-8ced-e23e79f6f311|603|Le%20Poppycock%2DFrolicsome|6011417b-6905-4861-8ced-e23e79f6f311"}
	,{"dType":"CREATOR","nameEnc":"Kaize%20Topaz","uuidEnc":"913e4f4a%2D1ee2%2D442c%2D8661%2D957fe130c6ff"}
	,{"dType":"CREATOR","nameEnc":"Olivia%20Lalonde","uuidEnc":"6011417b%2D6905%2D4861%2D8ced%2De23e79f6f311"}
	,{"dType":"LIST","poseList":"604|Le%20Poppycock%2DHalf%20an%20answer|6011417b-6905-4861-8ced-e23e79f6f311|605|Le%20Poppycock%2DHeart%20first|6011417b-6905-4861-8ced-e23e79f6f311|606|Le%20Poppycock%2DHighlights|6011417b-6905-4861-8ced-e23e79f6f311|607|Le%20Poppycock%2DIn%20essence|6011417b-6905-4861-8ced-e23e79f6f311|608|Le%20Poppycock%2DInsinuations|6011417b-6905-4861-8ced-e23e79f6f311|609|Le%20Poppycock%2DIntrospection|6011417b-6905-4861-8ced-e23e79f6f311|610|Le%20Poppycock%2DLeaf%20song|6011417b-6905-4861-8ced-e23e79f6f311|611|Le%20Poppycock%2DLove%20Always|6011417b-6905-4861-8ced-e23e79f6f311|612|Le%20Poppycock%2DLuminosities|6011417b-6905-4861-8ced-e23e79f6f311|613|Le%20Poppycock%2DLush%20sighs|6011417b-6905-4861-8ced-e23e79f6f311|614|Le%20Poppycock%2DMeet%20the%20gaze|6011417b-6905-4861-8ced-e23e79f6f311|615|Le%20Poppycock%2DNothing%20happens|6011417b-6905-4861-8ced-e23e79f6f311"}
	,{"dType":"LIST","poseList":"616|Le%20Poppycock%2DOf%20the%20senses|6011417b-6905-4861-8ced-e23e79f6f311|617|Le%20Poppycock%2DPerpetually%20Yours|6011417b-6905-4861-8ced-e23e79f6f311|618|Le%20Poppycock%2DPoetic%20persona|6011417b-6905-4861-8ced-e23e79f6f311|619|Le%20Poppycock%2DResort%20life|6011417b-6905-4861-8ced-e23e79f6f311|620|Le%20Poppycock%2DSecond%20nature|6011417b-6905-4861-8ced-e23e79f6f311|621|Le%20Poppycock%2DSensations|6011417b-6905-4861-8ced-e23e79f6f311|622|Le%20Poppycock%2DSheer%20luxury|6011417b-6905-4861-8ced-e23e79f6f311|623|Le%20Poppycock%2DSight%20for%20Sore%20Eyes|6011417b-6905-4861-8ced-e23e79f6f311|624|Le%20Poppycock%2DTeeth%20are%20always%20in%20style|6011417b-6905-4861-8ced-e23e79f6f311|625|Le%20Poppycock%2DWords%20are%20cheap|6011417b-6905-4861-8ced-e23e79f6f311|626|Le%20Poppycock%2DZesty|6011417b-6905-4861-8ced-e23e79f6f311"}
	,{"dType":"LIST","poseList":"627|Lyrium%2E%20Alice%20Breathing%20Animation%201%20CURVY%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|628|Lyrium%2E%20Alice%20Breathing%20Animation%201%20CURVY%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|629|Lyrium%2E%20Alice%20Breathing%20Animation%201%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|630|Lyrium%2E%20Alice%20Breathing%20Animation%201%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|631|Lyrium%2E%20Alice%20Breathing%20Animation%202%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|632|Lyrium%2E%20Alice%20Breathing%20Animation%202%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|633|Lyrium%2E%20Alice%20Breathing%20Animation%203%20CURVY%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|634|Lyrium%2E%20Alice%20Breathing%20Animation%203%20CURVY%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|635|Lyrium%2E%20Alice%20Breathing%20Animation%203%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe"}
	,{"dType":"CREATOR","nameEnc":"Ni%20Avril","uuidEnc":"4d2880f5%2D3533%2D40a1%2Dad4d%2D4bbcc0c3cdbe"}
	,{"dType":"LIST","poseList":"636|Lyrium%2E%20Alice%20Breathing%20Animation%203%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|637|Lyrium%2E%20Alice%20Breathing%20Animation%204%20CURVY%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|638|Lyrium%2E%20Alice%20Breathing%20Animation%204%20CURVY%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|639|Lyrium%2E%20Alice%20Breathing%20Animation%204%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|640|Lyrium%2E%20Alice%20Breathing%20Animation%204%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|641|Lyrium%2E%20Alice%20Static%201|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|642|Lyrium%2E%20Alice%20Static%201%20%5Bm%5D|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|643|Lyrium%2E%20Alice%20Static%201%20%5Bm%5D%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|644|Lyrium%2E%20Alice%20Static%201%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|645|Lyrium%2E%20Alice%20Static%202|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe"}
	,{"dType":"LIST","poseList":"646|Lyrium%2E%20Alice%20Static%202%20%5Bm%5D|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|647|Lyrium%2E%20Alice%20Static%203|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|648|Lyrium%2E%20Alice%20Static%203%20%5Bm%5D|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|649|Lyrium%2E%20Alice%20Static%203%20%5Bm%5D%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|650|Lyrium%2E%20Alice%20Static%203%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|651|Lyrium%2E%20Alice%20Static%204|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|652|Lyrium%2E%20Alice%20Static%204%20%5Bm%5D|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|653|Lyrium%2E%20Alice%20Static%204%20%5Bm%5D%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|654|Lyrium%2E%20Alice%20Static%204%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|655|Lyrium%2E%20Kellie%20Breathing%20Animation%201%20CURVY%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe"}
	,{"dType":"LIST","poseList":"656|Lyrium%2E%20Kellie%20Breathing%20Animation%201%20CURVY%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|657|Lyrium%2E%20Kellie%20Breathing%20Animation%201%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|658|Lyrium%2E%20Kellie%20Breathing%20Animation%201%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|659|Lyrium%2E%20Kellie%20Breathing%20Animation%202%20CURVY%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|660|Lyrium%2E%20Kellie%20Breathing%20Animation%202%20CURVY%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|661|Lyrium%2E%20Kellie%20Breathing%20Animation%202%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|662|Lyrium%2E%20Kellie%20Breathing%20Animation%202%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|663|Lyrium%2E%20Kellie%20Breathing%20Animation%203%20CURVY%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|664|Lyrium%2E%20Kellie%20Breathing%20Animation%203%20CURVY%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe"}
	,{"dType":"LIST","poseList":"665|Lyrium%2E%20Kellie%20Breathing%20Animation%203%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|666|Lyrium%2E%20Kellie%20Breathing%20Animation%203%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|667|Lyrium%2E%20Kellie%20Breathing%20Animation%204%20CURVY%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|668|Lyrium%2E%20Kellie%20Breathing%20Animation%204%20CURVY%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|669|Lyrium%2E%20Kellie%20Breathing%20Animation%204%20P3|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|670|Lyrium%2E%20Kellie%20Breathing%20Animation%204%20P4|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|671|Lyrium%2E%20Kellie%20Static%201|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|672|Lyrium%2E%20Kellie%20Static%201%20%5Bm%5D|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|673|Lyrium%2E%20Kellie%20Static%201%20%5Bm%5D%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe"}
	,{"dType":"LIST","poseList":"674|Lyrium%2E%20Kellie%20Static%201%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|675|Lyrium%2E%20Kellie%20Static%202|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|676|Lyrium%2E%20Kellie%20Static%202%20%5Bm%5D|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|677|Lyrium%2E%20Kellie%20Static%202%20%5Bm%5D%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|678|Lyrium%2E%20Kellie%20Static%202%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|679|Lyrium%2E%20Kellie%20Static%203|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|680|Lyrium%2E%20Kellie%20Static%203%20%5Bm%5D|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|681|Lyrium%2E%20Kellie%20Static%203%20%5Bm%5D%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|682|Lyrium%2E%20Kellie%20Static%203%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|683|Lyrium%2E%20Kellie%20Static%204|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|684|Lyrium%2E%20Kellie%20Static%204%20%5Bm%5D|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe"}
	,{"dType":"LIST","poseList":"685|Lyrium%2E%20Kellie%20Static%204%20%5Bm%5D%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|686|Lyrium%2E%20Kellie%20Static%204%20CURVY|4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe|687|mirinae%3A%20asami%201%20animation|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|688|mirinae%3A%20asami%201%20m%20animation|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|689|mirinae%3A%20asami%202%20animation|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|690|mirinae%3A%20asami%202%20m%20animation|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|691|mirinae%3A%20asami%203%20animation|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|692|mirinae%3A%20asami%203%20m%20animation|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|693|mirinae%3A%20betty%201|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|694|mirinae%3A%20betty%201%20m|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|695|mirinae%3A%20betty%202|d3a2ac65-fe39-4957-b98e-6d77db8b0a19"}
	,{"dType":"CREATOR","nameEnc":"Pinky%20Fluffpaw","uuidEnc":"d3a2ac65%2Dfe39%2D4957%2Db98e%2D6d77db8b0a19"}
	,{"dType":"LIST","poseList":"696|mirinae%3A%20betty%202%20m|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|697|mirinae%3A%20betty%203|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|698|mirinae%3A%20betty%203%20m|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|699|mirinae%3A%20betty%204|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|700|mirinae%3A%20betty%204%20m|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|701|mirinae%3A%20betty%205|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|702|mirinae%3A%20betty%205%20m|d3a2ac65-fe39-4957-b98e-6d77db8b0a19|703|Sari%2DSari%20%2D%20fp%20sit04%2Da%20%28bento%29|1c3d8b18-f975-4dd7-8d4e-760d6fb70336|704|Sari%2DSari%20%2D%20fp%20sit04%2Db%20%28bento%29|1c3d8b18-f975-4dd7-8d4e-760d6fb70336|705|Sari%2DSari%20%2D%20fp%20sit04%2Dc%20%28bento%29|1c3d8b18-f975-4dd7-8d4e-760d6fb70336|706|Sari%2DSari%20%2D%20fp%20sit04%2Dd%20%28bento%29|1c3d8b18-f975-4dd7-8d4e-760d6fb70336"}
	,{"dType":"CREATOR","nameEnc":"AbbyAnne%20Resident","uuidEnc":"1c3d8b18%2Df975%2D4dd7%2D8d4e%2D760d6fb70336"}
	,{"dType":"LIST","poseList":"707|Sari%2DSari%20%2D%20fp%20sit04%2De%20%28bento%29|1c3d8b18-f975-4dd7-8d4e-760d6fb70336|708|Sari%2DSari%20%2D%20fp%20sit04%2Df%20%28bento%29|1c3d8b18-f975-4dd7-8d4e-760d6fb70336|709|Secret%20Poses%20%2D%20Anais%201|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|710|Secret%20Poses%20%2D%20Anais%201%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|711|Secret%20Poses%20%2D%20Anais%202|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|712|Secret%20Poses%20%2D%20Anais%202%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|713|Secret%20Poses%20%2D%20Anais%203|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|714|Secret%20Poses%20%2D%20Anais%203%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|715|Secret%20Poses%20%2D%20Anais%204|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|716|Secret%20Poses%20%2D%20Anais%204%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|717|Secret%20Poses%20%2D%20Anais%205|6fc5cd68-c099-49e9-98ea-58bc6dff97c4"}
	,{"dType":"CREATOR","nameEnc":"SweetDaniellee%20Resident","uuidEnc":"6fc5cd68%2Dc099%2D49e9%2D98ea%2D58bc6dff97c4"}
	,{"dType":"LIST","poseList":"718|Secret%20Poses%20%2D%20Anais%205%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|719|Secret%20Poses%20%2D%20SheIsMagique%201|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|720|Secret%20Poses%20%2D%20SheIsMagique%201%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|721|Secret%20Poses%20%2D%20SheIsMagique%202|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|722|Secret%20Poses%20%2D%20SheIsMagique%202%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|723|Secret%20Poses%20%2D%20SheIsMagique%203|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|724|Secret%20Poses%20%2D%20SheIsMagique%203%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|725|Secret%20Poses%20%2D%20SheIsMagique%204|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|726|Secret%20Poses%20%2D%20SheIsMagique%204%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|727|Secret%20Poses%20%2D%20SheIsMagique%205|6fc5cd68-c099-49e9-98ea-58bc6dff97c4"}
	,{"dType":"LIST","poseList":"728|Secret%20Poses%20%2D%20SheIsMagique%205%5Bm%5D|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|729|Secret%20Poses%20%2D%20SwimAdventure%201|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|730|Secret%20Poses%20%2D%20SwimAdventure%202|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|731|Secret%20Poses%20%2D%20SwimAdventure%203|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|732|Secret%20Poses%20%2D%20SwimAdventure%204|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|733|Secret%20Poses%20%2D%20SwimAdventure%205|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|734|Secret%20Poses%20%2D%20SwimAdventure%206|6fc5cd68-c099-49e9-98ea-58bc6dff97c4|735|STUN%20%2D%20Lexie%201%20%28Static%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|736|STUN%20%2D%20Lexie%201%20%28Static%2BCurve%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|737|STUN%20%2D%20Lexie%201%20%28Static%2BMid%29|bb8fcf61-f5cd-44f5-b750-b573740a010e"}
	,{"dType":"CREATOR","nameEnc":"patricksillver%20Resident","uuidEnc":"bb8fcf61%2Df5cd%2D44f5%2Db750%2Db573740a010e"}
	,{"dType":"LIST","poseList":"738|STUN%20%2D%20Lexie%202%20%28Static%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|739|STUN%20%2D%20Lexie%202%20%28Static%2BCurve%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|740|STUN%20%2D%20Lexie%203%20%28Static%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|741|STUN%20%2D%20Lexie%203%20%28Static%2BCurve%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|742|STUN%20%2D%20Lexie%203%20%28Static%2BMid%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|743|STUN%20%2D%20Powder%201|bb8fcf61-f5cd-44f5-b750-b573740a010e|744|STUN%20%2D%20Powder%201%20%28Curve%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|745|STUN%20%2D%20Powder%201%20%28Curve%2BMirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|746|STUN%20%2D%20Powder%201%20%28Mirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|747|STUN%20%2D%20Powder%202|bb8fcf61-f5cd-44f5-b750-b573740a010e|748|STUN%20%2D%20Powder%202%20%28Mirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e"}
	,{"dType":"LIST","poseList":"749|STUN%20%2D%20Powder%203|bb8fcf61-f5cd-44f5-b750-b573740a010e|750|STUN%20%2D%20Powder%203%20%28Curve%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|751|STUN%20%2D%20Powder%203%20%28Curve%2BMirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|752|STUN%20%2D%20Powder%203%20%28Mirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|753|STUN%20%2D%20Powder%204|bb8fcf61-f5cd-44f5-b750-b573740a010e|754|STUN%20%2D%20Powder%204%20%28Curve%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|755|STUN%20%2D%20Powder%204%20%28Curve%2BMirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|756|STUN%20%2D%20Powder%204%20%28Mirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|757|STUN%20%2D%20Powder%205|bb8fcf61-f5cd-44f5-b750-b573740a010e|758|STUN%20%2D%20Powder%205%20%28Mirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|759|STUN%20%2D%20Powder%206|bb8fcf61-f5cd-44f5-b750-b573740a010e"}
	,{"dType":"LIST","poseList":"760|STUN%20%2D%20Powder%206%20%28Curve%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|761|STUN%20%2D%20Powder%206%20%28Curve%2BMirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|762|STUN%20%2D%20Powder%206%20%28Mirror%29|bb8fcf61-f5cd-44f5-b750-b573740a010e|763|STUN%20Anim%20%2D%20Eva%201|ad792a19-2f32-45a3-8ede-0af08271d6fa|764|STUN%20Anim%20%2D%20Eva%201%20%28curve%29|ad792a19-2f32-45a3-8ede-0af08271d6fa|765|STUN%20Anim%20%2D%20Eva%202|ad792a19-2f32-45a3-8ede-0af08271d6fa|766|STUN%20Anim%20%2D%20Eva%203|ad792a19-2f32-45a3-8ede-0af08271d6fa|767|STUN%20Anim%20%2D%20Eva%203%20%28curve%29|ad792a19-2f32-45a3-8ede-0af08271d6fa|768|STUN%20Anim%20%2D%20Malvene%201|ad792a19-2f32-45a3-8ede-0af08271d6fa|769|STUN%20Anim%20%2D%20Malvene%202|ad792a19-2f32-45a3-8ede-0af08271d6fa|770|STUN%20Anim%20%2D%20Malvene%202%20v2|ad792a19-2f32-45a3-8ede-0af08271d6fa"}
	,{"dType":"CREATOR","nameEnc":"Vidorra%20Conundrum","uuidEnc":"ad792a19%2D2f32%2D45a3%2D8ede%2D0af08271d6fa"}
	,{"dType":"LIST","poseList":"771|STUN%20Anim%20%2D%20Malvene%202%20v3|ad792a19-2f32-45a3-8ede-0af08271d6fa|772|STUN%20Anim%20%2D%20Malvene%202%20v4|ad792a19-2f32-45a3-8ede-0af08271d6fa|773|STUN%20Anim%20%2D%20Malvene%202%20v5|ad792a19-2f32-45a3-8ede-0af08271d6fa|774|STUN%20Anim%20%2D%20Malvene%203|ad792a19-2f32-45a3-8ede-0af08271d6fa|775|STUN%20Anim%20%2D%20Malvene%203%20%28curve%29|ad792a19-2f32-45a3-8ede-0af08271d6fa|776|STUN%20Anim%20%2D%20Malvene%203%20v2%20%28curve%29|ad792a19-2f32-45a3-8ede-0af08271d6fa|777|Sync%27D%20Motion%5F%5FOriginals%20%2D%204Min%2001|dd123452-8717-4121-8bf7-23e878b88fdd|778|Sync%27D%20Motion%5F%5FOriginals%20%2D%204Min%2002|dd123452-8717-4121-8bf7-23e878b88fdd|779|Sync%27D%20Motion%5F%5FOriginals%20%2D%204Min%2003|dd123452-8717-4121-8bf7-23e878b88fdd|780|Sync%27D%20Motion%5F%5FOriginals%20%2D%204Min%2004|dd123452-8717-4121-8bf7-23e878b88fdd"}
	,{"dType":"CREATOR","nameEnc":"syncd%20Resident","uuidEnc":"dd123452%2D8717%2D4121%2D8bf7%2D23e878b88fdd"}
	,{"dType":"LIST","poseList":"781|Sync%27D%20Motion%5F%5FOriginals%20%2D%204Min%2005|dd123452-8717-4121-8bf7-23e878b88fdd|782|Sync%27D%20Motion%5F%5FOriginals%20%2D%204Min%2006|dd123452-8717-4121-8bf7-23e878b88fdd|783|Sync%27D%20Motion%5F%5FOriginals%20%2D%2024H%2001|dd123452-8717-4121-8bf7-23e878b88fdd|784|Sync%27D%20Motion%5F%5FOriginals%20%2D%2024H%2002|dd123452-8717-4121-8bf7-23e878b88fdd|785|Sync%27D%20Motion%5F%5FOriginals%20%2D%2024H%2003|dd123452-8717-4121-8bf7-23e878b88fdd|786|Sync%27D%20Motion%5F%5FOriginals%20%2D%2024H%2004|dd123452-8717-4121-8bf7-23e878b88fdd|787|Sync%27D%20Motion%5F%5FOriginals%20%2D%2024H%2005|dd123452-8717-4121-8bf7-23e878b88fdd|788|Sync%27D%20Motion%5F%5FOriginals%20%2D%2024H%2006|dd123452-8717-4121-8bf7-23e878b88fdd|789|Sync%27D%20Motion%5F%5FOriginals%20%2D%20Size%2001|dd123452-8717-4121-8bf7-23e878b88fdd"}
	,{"dType":"LIST","poseList":"790|Sync%27D%20Motion%5F%5FOriginals%20%2D%20Size%2002|dd123452-8717-4121-8bf7-23e878b88fdd|791|Sync%27D%20Motion%5F%5FOriginals%20%2D%20Size%2003|dd123452-8717-4121-8bf7-23e878b88fdd|792|Sync%27D%20Motion%5F%5FOriginals%20%2D%20Size%2004|dd123452-8717-4121-8bf7-23e878b88fdd|793|Sync%27D%20Motion%5F%5FOriginals%20%2D%20Size%2005|dd123452-8717-4121-8bf7-23e878b88fdd|794|Sync%27D%20Motion%5F%5FOriginals%20%2D%20Size%2006|dd123452-8717-4121-8bf7-23e878b88fdd|795|trip01|c2bb6076-4560-4d59-a16e-1ca404fd4d23|796|UZME%5FOriental01|6d8da66a-19d4-4357-9b6a-e5af8538c823|797|UZME%5FOriental01m|6d8da66a-19d4-4357-9b6a-e5af8538c823|798|UZME%5FOriental02|6d8da66a-19d4-4357-9b6a-e5af8538c823|799|UZME%5FOriental02a|6d8da66a-19d4-4357-9b6a-e5af8538c823|800|UZME%5FOriental02am|6d8da66a-19d4-4357-9b6a-e5af8538c823|801|UZME%5FOriental02m|6d8da66a-19d4-4357-9b6a-e5af8538c823"}
	,{"dType":"CREATOR","nameEnc":"Kazusa%20Yoshikawa","uuidEnc":"6d8da66a%2D19d4%2D4357%2D9b6a%2De5af8538c823"}
	,{"dType":"LIST","poseList":"802|UZME%5FOriental03|6d8da66a-19d4-4357-9b6a-e5af8538c823|803|UZME%5FOriental03m|6d8da66a-19d4-4357-9b6a-e5af8538c823|804|UZME%5FOriental04|6d8da66a-19d4-4357-9b6a-e5af8538c823|805|UZME%5FOriental04a|6d8da66a-19d4-4357-9b6a-e5af8538c823|806|UZME%5FOriental04am|6d8da66a-19d4-4357-9b6a-e5af8538c823|807|UZME%5FOriental04m|6d8da66a-19d4-4357-9b6a-e5af8538c823|808|UZME%5FOriental05|6d8da66a-19d4-4357-9b6a-e5af8538c823|809|UZME%5FOriental05m|6d8da66a-19d4-4357-9b6a-e5af8538c823|810|UZME%5FOriental06|6d8da66a-19d4-4357-9b6a-e5af8538c823|811|UZME%5FOriental06m|6d8da66a-19d4-4357-9b6a-e5af8538c823|812|UZME%5FOriental07|6d8da66a-19d4-4357-9b6a-e5af8538c823|813|UZME%5FOriental07m|6d8da66a-19d4-4357-9b6a-e5af8538c823|814|UZME%5FOriental08L|6d8da66a-19d4-4357-9b6a-e5af8538c823|815|UZME%5FOriental08Lm|6d8da66a-19d4-4357-9b6a-e5af8538c823|816|UZME%5FOriental08R|6d8da66a-19d4-4357-9b6a-e5af8538c823"}
	,{"dType":"LIST","poseList":"817|UZME%5FOriental08Rm|6d8da66a-19d4-4357-9b6a-e5af8538c823|818|versuta%2E%20ai%20%2F%2F%201|5a8cda50-da74-4879-83b4-dc00679af028|819|versuta%2E%20ai%20%2F%2F%202|5a8cda50-da74-4879-83b4-dc00679af028|820|versuta%2E%20ai%20%2F%2F%203|5a8cda50-da74-4879-83b4-dc00679af028|821|versuta%2E%20ai%20%2F%2F%204|5a8cda50-da74-4879-83b4-dc00679af028|822|versuta%2E%20ai%20%2F%2F%205|5a8cda50-da74-4879-83b4-dc00679af028|823|versuta%2E%20ai%20%2F%2F%206|5a8cda50-da74-4879-83b4-dc00679af028|824|versuta%2E%20ai%20%2F%2F%207|5a8cda50-da74-4879-83b4-dc00679af028|825|versuta%2E%20ai%20%2F%2F%208|5a8cda50-da74-4879-83b4-dc00679af028|826|versuta%2E%20ai%20%2F%2F%209|5a8cda50-da74-4879-83b4-dc00679af028|827|versuta%2E%20ai%20%2F%2F%2010|5a8cda50-da74-4879-83b4-dc00679af028|828|versuta%2E%20eliya%20%2F%2F%201|5a8cda50-da74-4879-83b4-dc00679af028"}
	,{"dType":"CREATOR","nameEnc":"Vi%20Suki","uuidEnc":"5a8cda50%2Dda74%2D4879%2D83b4%2Ddc00679af028"}
	,{"dType":"LIST","poseList":"829|versuta%2E%20eliya%20%2F%2F%202|5a8cda50-da74-4879-83b4-dc00679af028|830|versuta%2E%20eliya%20%2F%2F%203|5a8cda50-da74-4879-83b4-dc00679af028|831|versuta%2E%20eliya%20%2F%2F%204|5a8cda50-da74-4879-83b4-dc00679af028|832|versuta%2E%20eliya%20%2F%2F%205|5a8cda50-da74-4879-83b4-dc00679af028|833|versuta%2E%20eliya%20%2F%2F%206|5a8cda50-da74-4879-83b4-dc00679af028|834|versuta%2E%20eliya%20%2F%2F%207|5a8cda50-da74-4879-83b4-dc00679af028|835|versuta%2E%20eliya%20%2F%2F%208|5a8cda50-da74-4879-83b4-dc00679af028|836|versuta%2E%20eliya%20%2F%2F%209|5a8cda50-da74-4879-83b4-dc00679af028|837|versuta%2E%20eliya%20%2F%2F%2010|5a8cda50-da74-4879-83b4-dc00679af028"}
					];

updateProgress(Object.keys(sampleJSON).length);

//JSONデータをアニメーション情報に変換する
for(let i in sampleJSON){
	let oneData = sampleJSON[i];
	makePoseInfo(oneData);
}

//バリエーション情報を作成
makeVariationInfo();

//名前によるグルーピング
makeNameGroup();

//基本要素を作成する
makeUI();
}
