public var thinkRate = 5.0;
public var attackAtStrength = 40;
public var cheatMoneyPerCycle = 0;

//private var possible_designs = [];
//public var possible_designs : String[];
private var squad_design = new GameObject[3];

private var my_player : Player;
private var team : int;

private var homeworld : GameObject;
private var my_planets = new Array();
private var enemy_planets = new Array();

private var thinkCooldown = 0.0;
private var total_strength = 0;

function Start() {
	my_player = GetComponent(Player);
	team = my_player.team;
	
	if(my_player != null) {
		//ThinkLoop();
	}
	else {
		Debug.Log("can't find AI player!");
	}
	
	//var foo = Resources.Load("FleetShip_Frigate.prefab");
	//Debug.Log("loaded resource " + foo.name);
}

function Update () {
	if(thinkCooldown > 0) thinkCooldown -= Time.deltaTime;
	else {
		ThinkLoop();
		thinkCooldown = thinkRate;
	}
}


function ThinkLoop() {
	var planets = FindObjectsOfType(Planet);
	var shipyards = FindObjectsOfType(Shipyard);
	my_planets.Clear();
	enemy_planets.Clear();
	
	for(var p in planets) {
		if(p.team != team) {
			enemy_planets.Add(p);
		}
		else {
			my_planets.Add(p);
		}
	}
	
	/*
	for(var sy in shipyards) {
		if(sy.team != team) {
			enemy_planets.Add(sy);
		}
		else {
			my_planets.Add(sy);
		}
	}
	*/
	
	
	for(var sy in shipyards)
	{
		if(sy.team == team)
		{
			homeworld = sy.gameObject;
			break;
		}
	}
	
	// I'm dead!
	if(shipyards.length == 0)
	{
		Debug.Log(my_player.name + " has been defeated!");
		Destroy(this);
	}
	
	Debug.Log("thinking!");
	ThinkEconomy();
	ThinkMilitary();
	
	my_player.cash += cheatMoneyPerCycle;
	
	//ThinkAgain();
}

function ThinkAgain() {
	yield WaitForSeconds(thinkRate);
	ThinkLoop();
}

function ThinkEconomy() {
	// look at my existing squads
	// find a squad design that would be nice to have
	// -- for now, let's just pick a random one! whee!
	/*
	var my_index = Random.Range(0, possible_designs.length);
	var my_design_string = possible_designs[my_index];
	
	// interpret the design
	var ranks = my_design_string.Split(",");
	for(var r in ranks) {
		
	}*/
	
	
	// see if it's in our budget (money_we_have * 0.8 or whatever)
	var budget = my_player.cash * 0.9;
	// budget is larger if we have a very low number of squads per planet (i.e. we're probably losing)
	// if so, create it at a planet close to an enemy planet
	var randomFleetShip : FleetShip;
	if(my_player.units == null)
	{
		// early out
		return;
	}
	
	var choices = my_player.units.shipCards;
	var randomship = choices[Random.Range(0, choices.Count)];
	randomFleetShip = randomship.GetComponent(FleetShip);
	
	squad_design[0] = randomship;
	squad_design[1] = randomship;
	squad_design[2] = randomship;
	
	var cost = Squadron.GetSquadronCostFromDesign(squad_design);
	if(cost <= budget && my_planets.length > 0)
	{
		// get planet
		//var planet = my_planets[0];
		//planet.ComissionSquadron(squad_design, "Frigate");
		var sy = my_player.shipyard.GetComponent(Shipyard);
		if(sy.team == team)
			sy.ComissionSquadron(squad_design, randomFleetShip.shipClass);
		
		// improve industry / economy
		//my_planets[0].UpgradeStat("economy");
		//my_planets[0].UpgradeStat("industry");
	}
}

function ThinkMilitary() {
	// evaluate the strength of each of our squadrons
	// -- you know what? fuck it. if we have a certain amount of strength, send most/all units
	// -- to the closest enemy planet
	total_strength = 0;
	var squads = FindObjectsOfType(Squadron);
	var my_squads = new Array();
	for(var s in squads) {
		// ignore squads that are megaships -- currently only shipyards
		if(s.team == team && s.shipClass != "Single") {
			// include only able-bodied squads
			var percentHP = s.GetPercentageHP();
			if(percentHP > 0.5) {
			
				// calc strength
				var strength = s.GetSquadronCost();
				total_strength += strength;
				
				my_squads.Add(s);
			}
			else if(percentHP <= 0.5)
			{
				// send this squad to the closest friendly planet
				var planet = GetClosestPlanet(s.transform.position);
				s.GoTo(planet.transform.position);
				Debug.Log("Sending " + s.fleetName + " to " + planet.name + " for healing");
			}
		}
	}
	
	//Debug.Log("Current strength: " + total_strength);
	
	if(total_strength > attackAtStrength)
	{
		Debug.Log("Decided to attack!");
		
		// find closest enemy planet
		//var enemy_planets = 

		
		// just pick my planet from the top of the stack
		//var source_planet = my_planets[0];
		var source_planet = homeworld;
		
		var targetted_planet : Vector3;
		var closest = Mathf.Infinity;
		for(var ep in enemy_planets) {
			var dist = (source_planet.transform.position - ep.transform.position).sqrMagnitude;
			if( dist < closest ) {
				targetted_planet = ep.transform.position;
				closest = dist;
			}
		}

		for(var s in my_squads) {
			s.GoTo(targetted_planet);
		}
	}
	
	
	// first, think defensively
	// poll planets to see if we are under attack
	// if so, look at how many enemies are attacking and calculate their "strength"
	// go through each of my squadrons in order of their distance to the attacked planet
	// evaluate their "strength" and keep sending squads to the planet until we 
	// exceed the "strength" of our attackers
	
	// if no one is under attack, 
	// think aggressively
	// find the planets closest to each of my squadrons
	// add the strengths of squadrons "belonging" to the same planet
	// if it exceeds a certain threshhold, it's time to attack.
	// pick the enemy planet closest to this megafleet and attack it
	
	// if I'm not ordering an attack, think about healing and redistributing
	// move damaged squads to the planet they "belong" to
	// move healthy squads to the closest frontline planet
}


function GetClosestPlanet(location : Vector3)
{
	var closest = Mathf.Infinity;
	var closestPlanet = my_planets[0];
	for(var p in my_planets)
	{
		var dist = (location - p.transform.position).sqrMagnitude;
		if(dist < closest)
		{
			closestPlanet = p;
			closest = dist;
		}
	}
	
	return closestPlanet;
}
