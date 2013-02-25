public var life = 100.0;
public var damage = 1;
public var penetration = 0;
public var squadron : GameObject;
public var weapon : GameObject;
public var target : Transform;
public var boom : GameObject;

private var startTime = 0.0;

function Start() {
	startTime = Time.fixedTime;
}

function FixedUpdate()
{
	if((Time.fixedTime - startTime) >= life)
	{
		Hit();
		startTime = Mathf.Infinity;
	}
}

function Hit()
{	
	if(target != null){
		// hit angle needed for directional damage modifications
		var angle = Vector3.Angle(target.transform.forward, -transform.forward);
		var hitData = new Array(damage, penetration, angle);
	
		target.SendMessage("OnDamage", hitData, SendMessageOptions.DontRequireReceiver);
	
		// FIXME: we should store a ref to the squadron
		//  to tell the squad it gets XP,
		//  in case the shooter of this bullet dies
		if(weapon != null)
		{
			if(weapon.transform.parent != null) {
				weapon.SendMessageUpwards("OnXP", damage, SendMessageOptions.DontRequireReceiver);
			}
			else {
				weapon.BroadcastMessage("OnXP", damage, SendMessageOptions.DontRequireReceiver);
			}
		}
	}
	
	if(boom != null)
		Instantiate(boom, transform.position, transform.rotation);
		
	//var trail = transform.Find("trail");
	//if(trail != null)
	//	trail.parent = null;
	//Destroy(gameObject);
	if(rigidbody != null)
	{
		rigidbody.velocity = Vector3.zero;
	}
	gameObject.SetActive(false);
}
	
