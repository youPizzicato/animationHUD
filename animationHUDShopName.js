//個人的によく使うお店の場合が、Shop名を記入しておく
function initShopInfo(){
	function setShopInfo(argUuid,argName,argShopName){
		if(argShopName==null){
			return;
		}
		if(argUuid in g_shopInfo){
			return;
		}
		g_shopInfo[argUuid] = {
			 pUuid:argUuid
			,pName:argName
			,pShopName:argShopName
			};
		console.log(g_shopInfo[argUuid]);
	}

	setShopInfo('1c3d8b18-f975-4dd7-8d4e-760d6fb70336','AbbyAnne Resident','Sari-Sari');
	setShopInfo('998ee36f-5bb8-4a87-8f2c-e14c855e4206','Agusandia Resident',null);
	setShopInfo('be6ef88a-fbcf-4b23-a5de-f41c4bf86430','alaiaroxx Resident','Bubble Gum');
	setShopInfo('3f683453-d06e-4ded-8494-36f72e90aae1','Alien Daddy','Space Cadet');
	setShopInfo('dcfca644-a306-4c16-be47-f6e9be5d414a','Ashlie Coba','PRINT');
	setShopInfo('9893564e-ddd2-4ddc-bbdc-1dbdf8ecef6b','AyraEdring Resident',null);
	setShopInfo('918c3489-4105-4a16-b67c-f99a8fc45c1b','Baby Vanilla','babyboo.');
	setShopInfo('1513ea20-46c0-4d87-a98e-08ed836996e5','Belle Vanilla','BellePoses');
	setShopInfo('0175ffcc-4029-4ef4-ba2f-634d03495e82','Bifu Szondi','BERAS');
	setShopInfo('08713682-b407-4066-bc2b-3320bf878626','Carolina Sautereau','KuddelMuddel');
	setShopInfo('d9c86cd6-0bca-4995-9d7c-84c3bc702f74','Dahriel Nova','PosESioN Store');
	setShopInfo('c7505cf3-124c-4b24-8588-2661a1e87082','Elizabeth973 Resident','Bubble Gum');
	setShopInfo('b06318a0-cc68-49cc-952a-28dc7329da37','emmyleitao Resident','PHOTOSHOOT');
	setShopInfo('8c385ca7-d4b8-486a-9453-e95383b3f489','Fanny Finney','Ana Poses');
	setShopInfo('5072e354-7349-4e32-bbab-6f6c2818d0b9','Gabriella Corpur','Le Fleur');
	setShopInfo('fc5faa18-1c4d-41a7-885c-cd18807aeb11','HaniaElaine Resident',null);
	setShopInfo('561a65e5-1b13-40b9-bd28-28f1d0d73c17','Jaay Tiratzo','Pose Maniacs');
	setShopInfo('15d73ada-ce5e-4f65-b8c3-d701098259a1','JasonBodylanguage Resident','MOVE!');
	setShopInfo('c9cfa9f9-b735-487e-a2b5-4f9f8a825b84','JNakagawa Resident',null);
	setShopInfo('913e4f4a-1ee2-442c-8661-957fe130c6ff','Kaize Topaz','KZ Poses');
	setShopInfo('be40a7dd-1236-4845-af20-3d5abe14e204','Katya Salty','K&S');
	setShopInfo('3b7eb225-a49f-4350-998e-d32d17b6349e','Katya Valeska','an lár [poses]');
	setShopInfo('6d8da66a-19d4-4357-9b6a-e5af8538c823','Kazusa Yoshikawa',null);
	setShopInfo('799ab241-da04-41bd-92ec-257e34f0c3dd','Kokoro Kiyori','Kokoro');
	setShopInfo('ca1037b9-2df3-4109-820f-32788609d890','LaPlumeStore Resident','LaPlume');
	setShopInfo('89e5a98a-0600-4f80-9c6d-73e28e508f15','Leyla Flux','KoKoLoReS');
	setShopInfo('4b028af7-f489-429a-8560-849512b34027','LiFetisova Resident',null);
	setShopInfo('73936862-5330-47a5-8c9b-f6d71269acb4','LuaneMeo Resident',null);
	setShopInfo('c2bb6076-4560-4d59-a16e-1ca404fd4d23','manmoth Nishi','BodyLanguage SLC');
	setShopInfo('0eb2bdd2-dd0b-4ed4-a9ce-295e3017cb3e','Maria1995uruguay Resident','Sweet Art');
	setShopInfo('e5a36b99-106b-4221-ac1a-1191a2d8faca','MelissaJeanne Flores','elephante poses');
	setShopInfo('5a9f1f0c-e3fc-48cc-aac8-89e7a6768b73','MidnightMistxX Resident','HERA');
	setShopInfo('e9dfb24c-49cf-45d7-9566-76626500adbb','MiraLeen Resident',null);
	setShopInfo('0220cf98-816f-40ef-b839-b454fb19e756','MOVEMENTT Resident',null);
	setShopInfo('ee61aafd-4029-43bd-a209-5f34859dd6cb','NadySapa Resident','SAPA');
	setShopInfo('4d2880f5-3533-40a1-ad4d-4bbcc0c3cdbe','Ni Avril','Lyrium');
	setShopInfo('4bad90e3-d854-416a-b371-83d4f0c9d5d6','ninalexa Resident',null);
	setShopInfo('6011417b-6905-4861-8ced-e23e79f6f311','Olivia Lalonde',null);
	setShopInfo('458d7eda-d7da-4068-8cb2-9f0a3063dda8','OliviaGolden Resident',null);
	setShopInfo('bb8fcf61-f5cd-44f5-b750-b573740a010e','patricksillver Resident','STUN');
	setShopInfo('d3a2ac65-fe39-4957-b98e-6d77db8b0a19','Pinky Fluffpaw','mirinae');
	setShopInfo('12afbf23-8293-477b-8e48-180fd25da581','PruKellar Resident',null);
	setShopInfo('65aca4aa-a2f3-40dd-96f4-3304018c0d01','Pupperino Resident',null);
	setShopInfo('704eede9-0589-49c4-9510-5673d6eed8ad','rashadghost Resident',null);
	setShopInfo('0b45782a-e32d-421d-ac14-5394fa7bc57b','Rie Silverfall',null);
	setShopInfo('778c136d-0f77-4e5a-af7b-abd9c14d365f','Rina Edenflower','Diversion');
	setShopInfo('aecced1b-c1dd-4ae4-b58b-674a4fcf780b','Shellina Alpha','OMY');
	setShopInfo('46445fa7-2ea7-42c8-bca2-99834642e67c','Shelly Gurbux','RIZZI Animation');
	setShopInfo('6fc5cd68-c099-49e9-98ea-58bc6dff97c4','SweetDaniellee Resident',null);
	setShopInfo('dd123452-8717-4121-8bf7-23e878b88fdd','syncd Resident',null);
	setShopInfo('a75f4a08-3c88-4aec-9c44-6febef91efcc','Tempesta Arun','Peekaboo');
	setShopInfo('5a8cda50-da74-4879-83b4-dc00679af028','Vi Suki','versuta');
	setShopInfo('ad792a19-2f32-45a3-8ede-0af08271d6fa','Vidorra Conundrum','STUN');
	setShopInfo('6e793f86-d5df-4355-806e-240986e576e2','wetcat Flux','WetCat Builds&Poses');
	setShopInfo('b541b026-1822-42b9-aa7e-ca393d8f3c82','Yukiko Yeshto','KuddelMuddel');
}
