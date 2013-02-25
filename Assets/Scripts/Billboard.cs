using UnityEngine;
using System.Collections;

public class Billboard : MonoBehaviour
{
	/*
	public Camera camera;
	
	void Start()
	{
		if(camera == null)
		{
			camera = Camera.main;
		}
	}
	*/
	
	private Renderer[] childRenderers;
	
	void Start()
	{
		if(renderer == null)
		{
			childRenderers = GetComponentsInChildren<Renderer>();
		}
	}
	
	public bool IsVisible
	{
		get
		{
			if(renderer != null)
			{
				return renderer.isVisible;
			}
			else
			{
				foreach(Renderer render in childRenderers)
				{
					if(render.isVisible)
					{
						return true;
					}
				}
				
				return false;
			}
		}
	}
	
	void LateUpdate()
	{
		if(IsVisible)
		{
			transform.rotation = Camera.main.transform.rotation;
		}
	}

}
