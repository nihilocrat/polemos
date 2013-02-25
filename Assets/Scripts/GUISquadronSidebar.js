@script AddComponentMenu("GUI Panels/Sidebar - Squadron")

public var show = true;
public var skin : GUISkin;

private var myPlayer : Player;

private var mySquads : Array;
private var sidebarRect : Rect;


private var barTextures : Array;


function Start() {
	myPlayer = TeamSettings.getSingleton().humanPlayer;
	sidebarRect = new Rect(0,24,120,400);
	
	
	barTextures = [
		Resources.Load("healthbar_vertical/healthbar_vertical_1"),
		Resources.Load("healthbar_vertical/healthbar_vertical_1"),
		Resources.Load("healthbar_vertical/healthbar_vertical_2"),
		Resources.Load("healthbar_vertical/healthbar_vertical_3"),
		Resources.Load("healthbar_vertical/healthbar_vertical_4")
	];
	
	resetStats();
}

function resetStats() {
	mySquads = myPlayer.getSquads();
	updateLoop();
}

function updateLoop() {
	yield WaitForSeconds(2.0);
	resetStats();
}

function Update() {
	if(Input.GetButtonDown("Map")) {
		if(show) show = false;
		else show = true;
	}
}

function OnGUI()
{
	GUI.skin = skin;

	GUI.Box(Rect(0,0,120,24), "Squads: ("+ myPlayer.squadCount +"/"+ myPlayer.squad_cap +")");
	GUI.BeginGroup (Rect(0,24,120,400));

	// stuff beyond this point is not shown unless the map is up
	if(show) {		
		for(var i=0; i < mySquads.length ; i++){
			var squad = mySquads[i];
			
			GUI.BeginGroup(Rect(0,40 * i, 120, 40));
			GUI.Box(Rect(0,0, 120, 40), "");
			GUI.DrawTexture(Rect(22,2,32,32), squad.GetBanner());
			GUI.Label(Rect(0,0, 120, 40), squad.fleetName.Split(" "[0])[0]);
			
			var display = String.Format("{0} / {1}", squad.aliveMemberCount, squad.troopCount);
			
			GUI.Label(Rect(60, 10, 100, 20), display);
			
			GUI.EndGroup();
		}
	}
	
	
	GUI.EndGroup();
}



function DrawHealthBarVertical(x,y, ship : FleetShip)
{
	// pick the number of segments present out of 4
	var texturenumber = Mathf.Ceil((parseFloat(ship.GetHP()) / parseFloat(ship.max_hp)) * 4.0);

	var r = Rect(x, y, 8,16);
	if(texturenumber > 0) {
		//var tex_path = "healthbar_vertical/healthbar_vertical_"+texturenumber.ToString();
		GUI.DrawTexture(r, barTextures[texturenumber]);
	}

}


