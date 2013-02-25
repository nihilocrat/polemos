import Globals;
import System.Collections;
import System.Collections.Generic;

public var squadBannerPrefab : GameObject;

public var team = 1;
public var rank = 1;

public var max_hp = 2000;
private var hp = max_hp;

public var heal_rate = 40;
public var slots = Array();

public var stats = Hashtable();
public var statList = ["economy", "industry", "defense"];

private var Cargo : Cargo;
private var attackers : List.<Squadron>;
private var lastAttacker : Squadron;
private var tickCooldown = 0.0;
private var max_tickCooldown = 5.0;

private var captureTeam = 0;
private var captureProgress = 0.0;

private var myPlayer : Player;
private var myBlazon : Transform;
private var myBlazonOffset = new Vector3(0,-5,0);
private var captureBlazon : Transform;

private var healAreaIndicator : Transform;

private var presenceSize = 0.0;

function Awake()
{
	stats["economy"] = 1;
	stats["industry"] = 1;
	stats["defense"] = 1;
	
	myBlazon = transform.Find("banner");
	myBlazonOffset = myBlazon.localPosition;
	
	var captureObj = Instantiate(myBlazon.gameObject, myBlazon.position, myBlazon.rotation);
	captureBlazon = captureObj.transform;
	captureBlazon.parent = transform;
	captureObj.SetActive(false);
	
	healAreaIndicator = transform.Find("heal_area/heal_area_indicator");
	healAreaIndicator.gameObject.active = false;
	
	var col = GetComponent(SphereCollider);
	presenceSize = col.radius * col.radius * 3;
	
	attackers = new List.<Squadron>();
}

function Start()
{
	SetPlayer(team);
	
	// prefill slots
	slots.Add("-");
	
	stats["economy"] = 1;
	stats["industry"] = 1;
	stats["defense"] = 1;
	
	// silly hack to get the banner to display properly
	yield WaitForSeconds(0.05);
	SetPlayer(team);
}

function OnSelected() {
	healAreaIndicator.gameObject.active = true;
}

function OnUnSelected() {
	healAreaIndicator.gameObject.active = false;
}


function SetPlayer(team_id : int) {
	team = team_id;
	myPlayer = Player.getPlayer(team_id);
	SetTeamColor(team_id);
	myBlazon.renderer.material.mainTexture = myPlayer.GetBlazon();
	
	// pass message to other things, such as: HealArea
	gameObject.BroadcastMessage("OnSetPlayer", team_id);
}


function SetTeamColor(team_id : int) {
	// FIXME: set my material to the team material
	var planetmesh = transform.Find("planet");
	var planetmat = TeamSettings.getSingleton().teamPlanetMaterials[team_id];
	planetmesh.renderer.sharedMaterial = planetmat;
}

function Update()
{
	if(captureProgress > 0.0)
	{			
		// adjust banner height
		myBlazon.localPosition = myBlazonOffset * ((0.5 - captureProgress) / 0.5);
		
		if(captureProgress > 0.5)
		{
			if(!captureBlazon.gameObject.activeSelf)
			{
				captureBlazon.gameObject.SetActive(true);
				captureBlazon.renderer.material.mainTexture = Player.getPlayer(captureTeam).GetBlazon();
			}
			captureBlazon.localPosition = myBlazonOffset * ((captureProgress - 0.5) / 0.5);
		}
		else
		{
			captureBlazon.gameObject.SetActive(false);
		}
	}

	//FIXME : turn this into a yield loop
	if(tickCooldown > 0) tickCooldown -= Time.deltaTime;
	else
	{
		// clean out missing attackers
		var toRemove = List.<Squadron>();
		for(var attacker in attackers)
		{
			if(attacker == null ||
			   (attacker.transform.position - transform.position).sqrMagnitude > presenceSize
			)
			{
				toRemove.Add(attacker);
			}
		}
		for(var rem : Squadron in toRemove)
		{
			attackers.Remove(rem);
		}
	
		// don't heal while under attack...
		if(!IsUnderAttack())
		{
			if(hp < max_hp) hp += heal_rate; //Debug.Log(name + " is healing itself");}
			if(hp > max_hp) hp = max_hp;
		}
		
		if(attackers.Count == 0 && captureProgress > 0.0)
		{
			captureProgress -= 10.0;
			if(captureProgress < 0.0)
			{
				captureProgress = 0.0;
				captureTeam = 0;
			}
		}
	
		tickCooldown = max_tickCooldown;
	}
}

/*
function OnGUI()
{
	if(myBlazon != null)
	{
		var iconPos = Camera.main.WorldToScreenPoint(transform.position + myBlazonOffset);
		if(iconPos.z >= 0) {
			iconPos.x /= Screen.width;
			iconPos.y /= Screen.height;
			myBlazon.transform.position = iconPos;
		}
	}
}
*/


function Upgrade() : boolean {
	// we gotz the moneys?
	if(myPlayer.cash < rank * Globals.planet_upgrade_cost_per_rank) return false;
	
	myPlayer.cash -= rank * Globals.planet_upgrade_cost_per_rank;
	
	// kay, upgrade
	rank += 1;
	myPlayer.resetCashRate(); // FIXME : might want to send a message instead
	max_hp = rank * 2000;
	hp = max_hp;
	slots.Add("-");
	return true;
}

function UpgradeStat(statName : String) : boolean {
	// we gotz the moneys?
	if(myPlayer.cash < GetUpgradeCost(statName)) return false;
	
	myPlayer.cash -= stats[statName] * Globals.planet_upgrade_cost_per_rank;
	
	// kay, upgrade
	stats[statName] += 1;
	
	// upgrade actual attributes based on stat levels
	if(statName == "economy") {
		myPlayer.resetStats(); // FIXME : might want to send a message instead
	}
	else if(statName == "industry") {
		myPlayer.resetStats(); // FIXME : might want to send a message instead
	}
	else if(statName == "defense") {
		max_hp = stats[statName] * 2000;
		hp = max_hp;
	}
	
	return true;
}

function GetUpgradeCost(statName : String) : int {
	var cost = stats[statName] * Globals.planet_upgrade_cost_per_rank;
	if( myPlayer.GetStat("percent_planet_upgrade_cost") != 0 )
		cost *= myPlayer.GetStat("percent_planet_upgrade_cost");
	return cost;
}

function GetHP() : int {
	return hp;
}

function GetCaptureProgress() : float {
	return captureProgress;
}

function GetCaptureTeam() : int {
	return captureTeam;
}


function OnEnemyAttack(attacker : Squadron) {
	if(attackers.Contains(attacker))
	{
		return;
	}
	
	lastAttacker = attacker;
	
	captureTeam = attacker.team;
	// capturables first need to become independent
	if(team != 0)
	{
		captureTeam = 0;
	}
		
	attackers.Add(attacker);
}

function OnEnemyDisengage(attacker : Squadron) {
	attackers.Remove(attacker);
}

function OnPerformCapture(amount : float) {
	// each point reduces capture amount by an equivalent of 4 ships
	// might want to make this remove a percentage of capture amount instead
	var defenseBonus = (stats["defense"] - 1) * (0.003 * 4) * Time.deltaTime;
	var minAmount = 0.003 * Time.deltaTime;
	
	// minimum capture amount == one ship
	captureProgress += Mathf.Max(minAmount, amount - defenseBonus);
	
	if(captureProgress >= 1.0)
	{
		if(team == 0)
		{
			Kill();
		}
		else
		{
			// if capturing an enemy, must first revert to neutral
			// then capture that
			captureTeam = 0;
			Kill();
		}
	}
}

function OnDamage(amount : int) {
	// potential damage formula
	//var totaldamage = amount - Mathf.Max(0, armor - penetration);
	
	// this assumes a little too much about WHY we are being sent the message,
	// but it is currently better than the alternatives
	// FIXME: we should instead keep a LIST of attackers, and let the attackers
	//  send a message to join or leave the list

	if(hp > 0) hp -= amount;
	if(hp <= 0){
		hp = 0;
		Kill();
	}
	else if(hp > max_hp) hp = max_hp;
}

function Kill() {
	// I need to figure out who killed me, and switch to their team
	var oldTeam = team;
	var oldPlayer = Player.getPlayer(oldTeam);
	team = captureTeam;	
	
	// ugh
	lastAttacker.OnVictory();
	SetPlayer(captureTeam);
	gameObject.BroadcastMessage("SetPlayer", captureTeam);
	
	hp = 100;
	captureProgress = 0.0;
	captureTeam = 0;
	
	// exchange banners
	captureBlazon.gameObject.SetActive(false);
	myBlazon.localPosition = myBlazonOffset;
	
	myPlayer.resetStats();
	oldPlayer.resetStats();
	
	// tell the director that a planet has been captured
	Director.getSingleton().OnPlanetCapture(this, oldPlayer, myPlayer);
	
	// we are assuming that ALL our attackers
	// are friendly to the new team. I think if this is not the case,
	// the unfriendly attacker will simply re-engage the planet.
	// therefore it's probably safe (and easiest) to just clear my attackers
	attackers.Clear();
}


function IsUnderAttack() : boolean {
	if(attackers != null && attackers.Count > 0) return true;
	return false;
}