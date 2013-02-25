
@script AddComponentMenu("GUI Panels/Main Menu")

function OnGUI()
{
	var menuRect = new Rect((Screen.width * transform.position.x)-100,Screen.height * transform.position.y,200,100);
	
	//GUI.Box(menuRect, "");
	
	GUILayout.BeginArea(menuRect);
	GUILayout.BeginVertical();

	if(GUILayout.Button("Play Skirmish with AI")) {
		Application.LoadLevel("2_battlescape");
	}

	//if(GUILayout.Button("Play Tutorial")) {
	//	Application.LoadLevel("3_tutorial");
	//}
	
	if(!Application.isWebPlayer)
	{
		if(GUILayout.Button("Quit")) {
			Application.Quit();
		}
	}
	
	GUILayout.EndVertical();
	GUILayout.EndArea();
}