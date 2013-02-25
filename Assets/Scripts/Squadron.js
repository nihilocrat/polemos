import Globals;
import System.Collections.Generic;

public var troopCount = 20;
public var columns = 5;
public var fleetName = "1ere Habitants";
public var captainName = "Foobar Foobarius";
public var team = 1;
public var rank = 0;
public var flagship : GameObject;
public var shipClass = "Frigate";
public var currentFormation = "combat";

public var spawnWithFullHP = false;

public var Chatter_engage : AudioClip;
public var Chatter_roger : AudioClip;

// list of prefabs in a particular order, determining fleet design
public var design : GameObject[];

public var banner_background : Texture2D;

public var pointerPrefab : GameObject;

public var isCommandable = true;

// list of actual ships on the field belonging to this fleet
public var members = ArrayList();
public var aliveMemberCount = 0;
private var memberMax = 7;

static public var formations = {
	"combat" : [
		new Vector3(0,0,0),
		new Vector3(-1,-0.5,1),
		new Vector3(-0.5,0.5,1),
		new Vector3(0.5,0.5,1),
		new Vector3(1,-0.5,1),
		new Vector3(-1.5,0,0),
		new Vector3(1.5,0,0)
	],
	"skirmish" : [
		new Vector3(0,0,0),
		new Vector3(-1,0.5,1),
		new Vector3( 1,-0.5,1),
		new Vector3(-1,-0.5,-1),
		new Vector3(1,0.5,-1),
		new Vector3(-2,0,0),
		new Vector3(2,0,0)
	],
	"column" : [
		new Vector3(0,0, 0),
		new Vector3(0,0.5, 2),
		new Vector3(0,-0.5, 2),
		new Vector3(0,0.5,-2),
		new Vector3(0,-0.5,-2),
		new Vector3(0,0, 1),
		new Vector3(0,0,-1)
	],
	
	"combat2D" : [
		new Vector3(0,0,0),
		new Vector3(-0.5,0.25,1),
		new Vector3(-0.5,-0.25,1),
		new Vector3(0.5,0.25,1),
		new Vector3(0.5,-0.25,1),
		new Vector3(-1,0,0),
		new Vector3(1,0,0)
	],
	"skirmish2D" : [
		new Vector3(0,0,0),
		new Vector3(-1,0,1),
		new Vector3( 1,0,1),
		new Vector3(-1,0,-1),
		new Vector3(1,0,-1),
		new Vector3(-2,0,0),
		new Vector3(2,0,0)
	],
	"column2D" : [
		new Vector3(0,0, 0),
		new Vector3(0,0, 3),
		new Vector3(0,0, 2),
		new Vector3(0,0,-2),
		new Vector3(0,0,-3),
		new Vector3(0,0, 1),
		new Vector3(0,0,-1)
	]
};

static public var formation_stats = {
	"combat" : {
		"speed" : 1.0,
		"damage" : 1.0
	},
	"skirmish" : {
		"speed" : 1.2,
		"damage" : 0.8
	},
	"column" : {
		"speed" : 1.4,
		"damage" : 0.6
	}
};

private var range;
private var spacing = 1.5;

public var morale = 100.0;
public var maxMorale = 100.0;
public var xp = 0;

// for keeping track of healing
private var max_healCooldown = 1.0;
private var healCooldown = 0.0;

private var max_tickCooldown = 1.0;
private var tickCooldown = 0.0;

public var status = "idle";

private var myPlayer : Player;
private var team_material : Material;
private var team_contrail_material : Material;
private var combatTarget : Squadron;
private var combatTargetPlanet : Planet;
private var moveTarget = Vector3.zero;
private var squad_icon : Texture2D;
private var banner : Texture2D;
private var bannerOffset;
private var rout : Transform;

private var pointer : Transform;
private var firing_arc : Transform;

// an ugly var that needs to die
private var revivingFlagship = false;

// enemies I am currently engaged with
//public var combatTargets = Array();
// NOTE : use a List in the future when this script is ported to C#
public var combatTargets = new ArrayList();

public var combatAttackers = new ArrayList();

public var influence : SquadInfluence;
public var presence : SquadPresence;
private var engageRange : float;
private var suspendOrders = false;

private var sqrIconViewDistance    = Mathf.Pow(40,2);
private var sqrIconViewDistanceMin = Mathf.Pow(2,2);


private var formation : Vector3[];

function Start() {
	bannerOffset = transform.localPosition;
	var pObj = Instantiate(pointerPrefab, Vector3.zero, transform.rotation);
	pointer = pObj.transform;
	pObj.active = false;

	// adjust XP to match rank
	xp = (rank - 1) * Globals.xp_per_level * (Globals.xp_scale * rank);
	
	//team_material = TeamSettings.getSingleton().getMaterial(team);
	//team_contrail_material = TeamSettings.getSingleton().getContrailMaterial(team);
	myPlayer = Player.getPlayer(team);
	team_material = myPlayer.shipMaterial;
	team_contrail_material = myPlayer.contrailMaterial;
	
	// NOTE: assumes a predictable layout of designs[]
	if(design.length <= 0) return true;
	if(flagship == null) {
		flagship = Instantiate(design[0], transform.position, Quaternion.identity);
		transform.parent = flagship.transform;
		transform.localPosition = bannerOffset;
	}
	AddShip(flagship);

	var o = flagship.transform.position;
	var r = flagship.transform.rotation;
	
	formation = new Vector3[troopCount];
	var troopsPerColumn = Mathf.Ceil(troopCount / columns);
	var row = 0;
	var col =0;
	for(var i=1; i<troopCount; i++)
	{
		row = i % troopsPerColumn;
		
		if(row == 0)
		{
			col += 1;
		}
		
		var pos = Vector3(col * spacing, 0.0, row * spacing);
		AddShip( Instantiate(design[0], o + pos, r) );
		formation[i] = pos;
	}
	
	var bravery = 10.0;
	maxMorale = members.Count * bravery;
	morale = maxMorale;
	
	// spawn flagship
	//AddShip(Instantiate(design[2], o, r));
	
	// hook up shipyard if needed
	// (this can be removed if the foldship gets unsquadded)
	var sy = members[0].GetComponent(Shipyard);
	if( sy != null )
	{
		Debug.Log("setting shipyard team manually for " + members[0].name);
		sy.SetPlayer(team);
	}
	
	var blazonRender : MeshRenderer = transform.Find("banner").GetComponent(MeshRenderer);
	var tex = myPlayer.GetBlazon();
	blazonRender.material.mainTexture = tex;
	rout = blazonRender.transform.Find("rout");
	rout.gameObject.SetActive(false);
	
	
	var labelPos = Camera.main.WorldToScreenPoint(transform.position + new Vector3(0,1,0));
	//var prefab = GameObject("fleetLabel");
	//prefab.AddComponent(GUIText);
	//prefab.AddComponent(GUITexture);
	//label.guiText.text = fleetName;
	// squadron icon
	if(members.Count > 1)
		squad_icon = members[1].icon;
	else
		squad_icon = members[0].icon;

	
	// build and color the banner
	//GetComponent(SpriteObject);
	var bannerColor : Color;
	
	banner_background = Resources.Load("icons/banner_"+ shipClass.ToLower());
	
	// FIXME : ugh ugh ugh
	if(team == 1) bannerColor = new Color(0.0,1.0,0.0,1.0);
	else bannerColor = new Color(1.0,0.0,0.0,1.0);
	
	var colorBanner = TextureUtils.Colorize(banner_background.GetPixels(),
		bannerColor);
	var iconBanner = TextureUtils.Colorize(squad_icon.GetPixels(), bannerColor);
	
	var bannerPixels = TextureUtils.Paste(iconBanner, colorBanner);
	banner = new Texture2D(banner_background.width, banner_background.height);
	banner.SetPixels(bannerPixels);
	banner.Apply();
	
	// new squads normally start with just a flagship and must spawn + heal the rest
	if(!spawnWithFullHP)
	{
		for(var m : FleetShip in members)
		{
			if(m != members[0])
			{			
				m.alive = false;
				m.SetHP(0);
				m.gameObject.active = false;
			}
			else
			{
				// first ship in a new squad has half HP
				m.SetHP(m.max_hp/2);
			}
		}
	}
	
	// setup range
	range = GetSquadronRange();
	influence = flagship.GetComponentInChildren(SquadInfluence);
	presence = flagship.GetComponentInChildren(SquadPresence);
	//engageRange = influence.collider.radius;
	engageRange = range;
	//if(influence != null)
	//	influence.collider.radius = range;
		
	firing_arc = transform.Find("squad_influence/firing_arc");
	if(firing_arc != null)
	{
		firing_arc.localScale.x = range / 5.0f;
		firing_arc.localScale.z = range / 5.0f;
		
		// set texture overlay based on the kind of arc this squad should have
		// FIXME : change this to a material-loading scheme to avoid creating material copies
		var thisArc = members[0].GetMainWeapon().arc;
		var arcTex = Resources.Load("firing_arc/firing_arc_" + thisArc.ToString()) as Texture2D;
		firing_arc.renderer.material.mainTexture = arcTex;
		
		firing_arc.gameObject.active = false;
	}
	
	aliveMemberCount = GetAliveMembers().Count;
	
	ResetSquadronSpeed();
}
/*
function OnGUI() {
	var distFromCamera = (Camera.main.transform.position - transform.position).sqrMagnitude;
	if(distFromCamera > sqrIconViewDistance || distFromCamera <= sqrIconViewDistanceMin)
	{
		return;
	}

	var iconPos = Camera.main.WorldToScreenPoint(transform.position);

	if(iconPos.z >= 0 ) {
		//var iconSize = Mathf.Max(1, 32 * ((20.0-Camera.main.transform.position.y)/20.0));
		var iconSize = 16;

		var bannerRect = new Rect(iconPos.x-iconSize,
			Screen.height - iconPos.y-iconSize,
			iconSize*2, iconSize*2);

		GUI.DrawTexture(bannerRect, banner);
		
		var rankpath = "ranks/rank_" + rank;
		GUI.DrawTexture(Rect(iconPos.x+8, Screen.height - iconPos.y+16, 8, 8), Resources.Load(rankpath));
	}
}
*/
function LateUpdate()
{
	//label.position = Camera.main.WorldToScreenPoint(transform.position + new Vector3(0,1,0));
	if(healCooldown > 0) healCooldown -= Time.deltaTime;

	// kind of a hack... stop attacking planets after we capture them
	if(combatTargetPlanet != null && combatTargets.Count == 0)
	{
		if(combatTargetPlanet.team == team)
		{
			//OnResumeOrders();
			OnVictory();
			//Disengage();
		}
		else
		{
			var baseCapture = 0.001;
			var captureBonus = myPlayer.GetStat("percent_capture_bonus") * 0.01;
			var neutralCaptureBonus = 0.0;
			/*if(combatTargetPlanet.team == 0)
			{
				neutralCaptureBonus = myPlayer.GetStat("percent_neutral_capture_bonus") * 0.01;
			}*/
			// capture bonuses don't compound, but they stack
			// FIXME : add a utils function to easily compound / stack bonuses?
			var netCapture = baseCapture + (baseCapture * captureBonus) + (baseCapture * neutralCaptureBonus);
			netCapture *= aliveMemberCount; //GetAliveMembers().Count;
			combatTargetPlanet.SendMessage("OnPerformCapture", netCapture * Time.deltaTime);
		}
	}
	
	if(!suspendOrders)
	{
		if(moveTarget != Vector3.zero) {
			// FIXME : smarter: wait for all my units to nullify their movetargets
			var finished = true;
			for(var m in members) {
				if(m.alive && m.GetMoveTarget() != Vector3.zero) {
					finished = false;
					break;
				}
			}
			
			if(finished) {
				moveTarget = Vector3.zero;
				status = "idle";
				pointer.gameObject.active = false;
				rout.gameObject.SetActive(false);
			}
			
			/*
			var minimum_distance = 0.5;
			var dist2targ = Vector3.Distance(transform.position, moveTarget);
			
			if(dist2targ < minimum_distance) {
				moveTarget = Vector3.zero;
				Debug.Log("finished moving!");
			}
			*/
		}
	}
		
	// clear dead squads out of my target list.
	// FIXME: it shouldn't be quite this way; we should either realize when we've killed a squad,
	// or the killed squad should tell me it's dead.
	var dead_squads = new Array();
	var enemy : Squadron;
	for(enemy in combatTargets) {
		if(enemy == null) dead_squads.Add(enemy);
		else if(enemy.status == "retreat") dead_squads.Add(enemy);
	}
	for(enemy in dead_squads)
	{
		combatTargets.Remove(enemy);
	}
	
	/*
	for(enemy in combatAttackers) {
		if(enemy == null) dead_squads.Add(enemy);
		else if(enemy.status == "retreat") dead_squads.Add(enemy);
	}
	for(enemy in dead_squads)
	{
		combatAttackers.Remove(enemy);
	}
	*/



	// have to keep resetting position
	// because unity collisions are sometimes really fucking stupid
	//transform.localPosition = bannerOffset;
	transform.position = GetSquadronCenter() + bannerOffset;	

	// Out of Combat actions
	if(combatTargets.Count <= 0 && combatTargetPlanet == null) {
		// regen morale
		if(morale < maxMorale && status != "retreat")
			morale += Time.deltaTime * 0.5;
		// reset squad influence
		if(transform.parent != flagship.transform) {
			transform.parent = flagship.transform;
			transform.localPosition = bannerOffset;
			//influence.transform.parent = flagship.transform;
		}
	}

	if(tickCooldown > 0) tickCooldown -= Time.deltaTime;
	else {
		tickCooldown += max_tickCooldown;
	}
	
	/*
	// automatically try respawning flagship when we can
	if(!members[0].alive && !revivingFlagship && combatTargets.Count <= 0) {
		ReviveFlagship();
	}
	*/
}

function AddShip(obj : GameObject) {
	//obj.renderer.sharedMaterial = team_material;
	var contrail = obj.transform.Find("contrail");
	if(contrail) {
		contrail.renderer.sharedMaterial = team_contrail_material;
	}
	
	ship = obj.GetComponent(FleetShip);
	ship.squadron = this;
	
	// wake up object and have it do things like create weapons
	ship.Awake();
	
	members.Add(ship);
}

function ReviveFlagship() {
	revivingFlagship = true;
	yield WaitForSeconds(Globals.flagshipReviveDelay);
	var flagship = members[0];
	flagship.Revive();
	// give him 25% hp free
	flagship.OnDamage(-flagship.max_hp/4);
	//ResetSquadronSpeed();
		
	revivingFlagship = false;
}

function OnSubmit(order : SquadronOrder)
{
	if(order.type == OrderType.GoTo)
	{
		GoTo(order.position, order.direction);
	}
	else if(order.type == OrderType.Retreat)
	{
		RetreatTo(order.position);
	}
}

function GoTo(destination : Vector3) {
	//get the heading we intend to go to
	var defaultDir = (destination - transform.position).normalized;
	
	GoTo(destination, defaultDir);
}

function GoTo(destination : Vector3, dir : Vector3) {
	// can't move if we are routed
	if(status == "retreat" && morale <= 0) return;
	
	if(dir == null) {
		dir = (destination - transform.position).normalized;
	}
	
	// if retreat status was set, set it back
	status = "idle";
	
	// clamp destination
	destination = new Vector3(
		Mathf.Round(destination.x),
		0.0, // no "z-level" in the game for now
		Mathf.Round(destination.z)
		/*Utils.StepRound(destination.x, 2.0),
		Utils.StepRound(destination.y, 2.0),
		Utils.StepRound(destination.z, 2.0)*/
	);
	
	var dest = new GameObject();
	var dirQuat = LookRotation(dir);
	dest.transform.position = destination;
	dest.transform.rotation = dirQuat;
	
	moveTarget = dest.transform.position;
	if(pointer != null)
	{
		pointer.position = moveTarget;
		pointer.rotation = dirQuat;
	}
	
	GotoFormationPositions(dest.transform, destination, dir);
	
	// old formation movement method
	/*
	for(var i = 0; i < members.Count; i++) {
		if(!members[i].active) continue;
		var real_dest = destination + dest.transform.TransformDirection(formation[i]);
		members[i].SendMessage("GoTo", real_dest);
	}
	*/
	
	/*
	for(var s : GameObject in members) {
		s.GetComponent(FleetShip).GoTo(destination);
	}*/
	
	//delete dest;
	// collect thy garbage!
	Destroy(dest);
}

function GotoFormationPositions(dest : Transform, destination : Vector3, direction : Vector3)
{
	var aliveMembers = GetAliveMembers();
	var count = aliveMembers.Count;
	
	for(var i = 0; i < count; i++)
	{
		var formationPos = destination + dest.TransformDirection(formation[i]);
		//var ship = GetClosestMember(aliveMembers, formationPos);
		var ship = aliveMembers[i];
		if(ship != null)
		{
			//aliveMembers.Remove(ship);
			ship.GoTo(formationPos, direction);
		}
	}
}

function SetPointer(destination : Vector3, dir : Vector3) {
	if(dir == null) {
		dir = (destination - transform.position).normalized;
	}
	
	// clamp destination
	destination = new Vector3(
		Mathf.Round(destination.x),
		Mathf.Round(destination.y),
		Mathf.Round(destination.z)
		/*Utils.StepRound(destination.x, 2.0),
		Utils.StepRound(destination.y, 2.0),
		Utils.StepRound(destination.z, 2.0)*/
	);
	
	pointer.position = destination;
	pointer.rotation = LookRotation(dir);
	
	pointer.gameObject.active = true;
}

function OnSelected()
{
	pointer.gameObject.active = true;
	if(firing_arc != null)
		firing_arc.gameObject.active = true;
}

function OnUnSelected()
{
	pointer.gameObject.active = false;
	if(firing_arc != null)
		firing_arc.gameObject.active = false;
}


function Disengage() {
	if(combatTarget != null) {
		combatTarget.SendMessage("OnEnemyDisengage", this);
	}
	for(var ct in combatTargets) {
		ct.SendMessage("OnEnemyDisengage", this);
	}
	if(combatTargetPlanet != null) {
		combatTargetPlanet.SendMessage("OnEnemyDisengage", this);
	}
	combatTarget = null;
	combatTargetPlanet = null;
	combatTargets.Clear();
	for(var m : FleetShip in members) m.Disengage();
}

function RetreatTo(destination : Vector3) {
	// can't retreat if we are routed
	if(status == "retreat" && morale <= 0) return;
	
	// retreat overrides orders
	OnResumeOrders();
	// tell my attackers I am fleeing
	for(var enemy in combatAttackers) OnEnemyDisengage(this);

	Debug.Log("trying to retreat!");
	Disengage();
	for(var m : FleetShip in members) m.Disengage();
	GoTo(destination);
	
	// set retreat status so the player is unable to command
	status = "retreat";
	//SetSquadronSpeed(1.2);
}

function Attack(other : Squadron) {
	if(combatTargets.Count > 0 || status == "retreat") return;
	
	/*
	if(team == TeamSettings.getSingleton().humanPlayer.team)
		audio.PlayOneShot(Chatter_engage);
	*/
	
	Messages.getSingleton().Add(team,
		fleetName +" have engaged the enemy");
	
	combatTarget = other;
	combatTargets.Add(other);
	
	if(combatTargetPlanet != null)
	{
		combatTargetPlanet.SendMessage("OnEnemyDisengage", this);
		combatTargetPlanet = null;
	}
	
	// provide attack orders to squadmates
	for(var m in GetAliveMembers()) {
		m.OnResumeOrders();
		var target = other.GetClosestMember(m.transform).transform;
		m.SendMessage("Attack", target);
	}
	
	// unparent the squad banner
	// sphere of influence should not move during combat
	// allows retreating enemies to escape
	//if(combatTargets.Count >= 1) {
	//	transform.parent = null;
	//	//influence.transform.parent = null;
	//}
	
	status = "combat";
}


function AttackPlanet(other : Planet) {
	if(combatTargets.Count > 0 || combatTargetPlanet != null) return;
	
	Messages.getSingleton().Add(team,
		fleetName +" have laid siege on " + other.name);
		
	combatTargetPlanet = other;

	status = "capture";
	OnSuspendOrders();
	
	// politely tell the planet that we have a flag
	other.SendMessage("OnEnemyAttack", this);
}


function OnEnemyAttack(squad : Squadron)
{
	combatAttackers.Add(squad);

	// fight back, if willing
	if(combatTargets.Count <= 0 && status != "retreat") {
		Attack(squad);
	}
}

function OnEnemyDisengage(retreater : Squadron) {
	// FIXME : actually we should pursue them a little
	//combatTargets.Remove(retreater);
	OnDisengage(retreater);
}

function OnMemberKilled(deadguy : FleetShip)
{
	var still_alive = GetAliveMembers();
	aliveMemberCount = still_alive.Count;
	
	if(still_alive.Count == 0)
	{
		Kill();
		return;
	}

	// see if we need to get another flagship
	if(flagship == null || flagship.GetComponent(FleetShip).alive == false)
	{
		flagship = still_alive[0].gameObject;
		transform.parent = flagship.transform;
		transform.localPosition = bannerOffset;
	}
	
	// see if the whole squad is dead
	/*
	var still_alive = false;
	for(var m : FleetShip in members) {
		if(m.alive) still_alive = true;
	}
	
	if(!still_alive) Kill();
	*/
}


function AddXP(amount : int) {
	xp += amount;
	// compare XP to level scale
	// adjust rank based on this.
	if(xp >= Globals.rank_xp_reqs[rank] && rank < Globals.rank_xp_reqs.Length-1)
	{
		rank++;
	}
}

function Rout() {
	if(morale == 0 && status == "retreat") return;

	// rout
	var routPos = 20.0 * transform.TransformDirection(-Vector3.forward);
	RetreatTo(transform.position + routPos);
	
	Messages.Broadcast(team, fleetName +" have been routed!");
	
	morale = 0;
	rout.gameObject.SetActive(true);
}

function AddMorale(amount : float) {
	// rout when we run out of morale
	// but be sure to call this only once per rout
	if (morale > 0 && morale + amount <= 0) {
		Rout();
	}
	else if(morale > 0) {
		morale += amount;
		if(morale > maxMorale) morale = maxMorale;
	}
}


function GetMemberOffset(idx : int) {
	if(idx == -1) return Vector3.zero;
	else {
		// FIXME: can no longer assume that the flagship is at the center of the formation
		return flagship.transform.TransformDirection(formation[idx]); //formations[currentFormation][idx]);
	}
}

function GetMemberOffset(m : FleetShip) {
	return GetMemberOffset(members.IndexOf(m));
}

function GetMemberPosition(m : FleetShip) {
}

function GetWeakestMember() {
	var weakest_hp = 1.0;
	var weakest : FleetShip;
	for(var m in members) {
		if(m.alive && m.GetHP() / m.max_hp < weakest_hp) {
			weakest_hp = m.GetHP() / m.max_hp;
			weakest = m;
		}
	}
	
	// everyone is at full health, now look for dead ships
	if(weakest == null) {
		for(var idx = 0; idx < members.Count ; idx++) {
			var m = members[idx];
			if(!m.alive) {
				weakest = m;
				// FIXME: set to the correct place in squad
				// FIXME : what are these side effects doing here?
				m.Revive();
				if(suspendOrders)
					m.SendMessage("OnSuspendOrders");
				flagship = GetNextFlagship().gameObject;
				//ResetSquadronSpeed();
				aliveMemberCount += 1;
				break;
			}
		}
	}
	
	return weakest;
}

function GetSlowestMember() {
	var slowest_speed = 9999;
	var slowest : FleetShip;
	for(var m in members) {
		var boid = m.GetComponent(Steerable);
		if(boid == null) continue;
		if(boid.impulse < slowest_speed) {
			slowest_speed = boid.GetBaseImpulse();
			slowest = m;
		}
	}
	
	//return slowest_speed;
	return slowest;
}

function ResetSquadronSpeed()
{
	SetSquadronSpeed(formation_stats[currentFormation]["speed"]);
}

function SetSquadronSpeed(speedPercent : float)
{
	// FIXME : move the details of this method to FleetShip

	// FIXME : don't modify impulse, modify some kinda "real_impulse"
	//  impulse should remain constant throughout the game so we know
	// how fast a ship is /able/ to go
	var slowest = GetSlowestMember();
	if(slowest != null) {
		var imp = slowest.GetComponent(Steerable).GetBaseImpulse() * speedPercent;
		for(var m : FleetShip in members)
		{
			var boid = m.GetComponent(Steerable);
			boid.impulse = imp;
			boid.ResetImpulse();
		}
	}
}

function ResetSquadronDamage()
{
	SetSquadronDamage(formation_stats[currentFormation]["damage"]);
}

function SetSquadronDamage(dmgPercent : float) {
	// FIXME : move the details of this method to FleetShip
	for(var m : FleetShip in members)
	{
		var gun = m.GetComponent(FleetWeapon);
		if(gun != null) gun.SetDamagePercent(dmgPercent);
	}
}

function ResetSquadronArmor()
{
	SetSquadronArmor(formation_stats[currentFormation]["armor"]);
}

function SetSquadronArmor(armorPercent : float) {
	// FIXME : move the details of this method to FleetShip
	for(var m : FleetShip in members)
	{
		m.armor = m.armor * armorPercent;
	}
}


function GetNextFlagship() : FleetShip
{
	for(var m in members)
	{
		if(m.alive) return m;
	}
	
	return null;
}


function GetSquadronRange() : float
{
	var highest_range = 0;
	for(var m in members) {
		var this_range = m.GetMainWeapon().range;
		if(this_range > highest_range) {
			highest_range = this_range;
		}
	}
	
	return highest_range;
}


function GetAliveMembers() : ArrayList
{
	var still_alive = new ArrayList();
	
	for(var m in members)
	{
		if(m.alive) still_alive.Add(m);
	}
	
	return still_alive;
}


function GetClosestMember(other : Transform) : FleetShip
{
	var closest : FleetShip;
	var closest_dist = Mathf.Infinity;
	for(var other_m in members) {
		if(!other_m.alive) continue;
		
		var dist = (other.position - other_m.transform.position).sqrMagnitude;
		if(dist < closest_dist) {
			closest = other_m;
			closest_dist = dist;
		}
	}
	
	return closest;
}


function GetClosestMember(myMembers : ArrayList, other : Vector3) : FleetShip
{
	var closest : FleetShip;
	var closest_dist = Mathf.Infinity;
	for(var other_m : FleetShip in myMembers) {
		if(!other_m.alive) continue;
		
		var dist = (other - other_m.transform.position).sqrMagnitude;
		if(dist < closest_dist) {
			closest = other_m;
			closest_dist = dist;
		}
	}
	
	return closest;
}



static function GetSquadronCostFromDesign(d)
{
	var total_cost = 0;
	if(d[0] != null) total_cost += d[0].GetComponent(FleetShip).cost * 4;
	if(d.length > 1 && d[1] != null) total_cost += d[1].GetComponent(FleetShip).cost * 2;
	if(d.length > 2 && d[2] != null) total_cost += d[2].GetComponent(FleetShip).cost;
	//if(d[3] != null) total_cost += d[3].GetComponent(FleetShip).cost;
	
	return total_cost;
}


function GetSquadronCost()
{
	return GetSquadronCostFromDesign(design);
}


function GetPercentageHP()
{
	var max_hp = 0;
	var total_hp = 0;
	for(var m in members) {
		max_hp += m.max_hp;
		total_hp += m.GetHP();
	}
	
	return parseFloat(total_hp) / parseFloat(max_hp);
}

function GetSquadronCenter()
{
	var aliveMembers = 0;
	var sum = Vector3.zero;

	for(var m in members)
	{
		if(!m.alive) continue;
		
		sum += m.transform.position;
		aliveMembers += 1;
	}
	
	return sum / aliveMembers;
}

//FIXME : make this OnDisengage
function OnVictory() {
	combatTarget = null;
	combatTargetPlanet = null;
	for(var m : FleetShip in GetAliveMembers()) m.SendMessage("Disengage");
	status = "idle";
	OnResumeOrders();
}

function OnDisengage(other : Squadron) {
	if(!combatTargets.Contains(other) || other == null) return;
	combatTargets.Remove(other);
	
	// tell my members to stop fighting these ships if they have them targetted
	for(var m : FleetShip in GetAliveMembers()) {
		var target = m.GetAttackTarget();
		if(target == null)
			continue;
		var ship = target.gameObject.GetComponent(FleetShip);
		if(ship != null && ship.squadron == other) {
			Debug.Log("disengaging enemy ship!");
			m.Disengage();
		}
	}
}


function OnSuspendOrders() {
	suspendOrders = true;
	
	for(var m in GetAliveMembers()) {
		m.SendMessage("OnSuspendOrders");
	}
}

function OnResumeOrders() {
	suspendOrders = false;
	
	for(var m in GetAliveMembers()) {
		m.SendMessage("OnResumeOrders");
	}
}


function GetStatus() {
	return status;
}

function GetEngageRange() {
	return engageRange;
}

function GetCombatTarget() {
	//if(combatTargetPlanet != null) return combatTargetPlanet;
	return combatTarget;
}


function GetCombatTargetPlanet() {
	//if(combatTargetPlanet != null) return combatTargetPlanet;
	return combatTargetPlanet;
}

function SetFormation(new_formation : String) {
	currentFormation = new_formation;
	ResetSquadronSpeed();
	ResetSquadronDamage();
}

function SetCombatTargetPlanet(value) {
	combatTargetPlanet = value;
}

function GetMoveTarget() {
	return moveTarget;
}

function GetPointer() {
	return pointer;
}

function GetBanner() {
	return banner;
}

function GetFormations() {
	return formations;
}

function GetHealCooldown() {
	return healCooldown;
}

function ResetHealCooldown() {
	healCooldown = max_healCooldown;
}

function LookRotation(dir : Vector3) : Quaternion
{
	var dirQuat : Quaternion;
	if(dir != Vector3.zero)
	{
		dirQuat = Quaternion.LookRotation(dir, Vector3.up);
	}
	else
	{
		dirQuat = Quaternion.identity;
	}
	
	return dirQuat;
}

function Kill() {
	// no theatrics for now
	Messages.Broadcast(team, "squadDestroyed", fleetName +" have been lost!");
	//Messages.getSingleton().Add(team,
	//	"We have liberated "+ gameObject.name +" from Team "+ oldTeam +"!");
	for(var m : FleetShip in members) {
		Destroy(m.gameObject);
	}
	
	Player.getPlayer(team).squadCount -= 1;
	
	// tell the director that I've been destroyed
	Director.getSingleton().OnSquadronDestroyed(this);
	
	Destroy(gameObject);
}
