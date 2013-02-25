using UnityEngine;
using System.Collections;

public class CharacterSprite : MonoBehaviour
{
	public int spriteID = 0;
	public Transform parentSprite;
	
	private Mesh mesh;
	private SpriteAtlas atlas;
	
	private int lastFrameID = -1;
	
	void Start ()
	{
		mesh = GetComponent<MeshFilter>().mesh;
		atlas = FindObjectOfType(typeof(SpriteAtlas)) as SpriteAtlas;
		
		UpdateSprite();
	}
	
	Vector3 Flatten(Vector3 vec)
	{
		return new Vector3(vec.x, 0.0f, vec.z);
	}
	
	void UpdateSprite()
	{
		var cam = Camera.main.transform;
		
		var masterTransform = transform;
		if(parentSprite != null)
		{
			masterTransform = parentSprite;
		}
		
		var dudeVec = Flatten(masterTransform.parent.forward);
		var camVec = Flatten(cam.forward);
		
		float orient = Vector3.Dot(dudeVec, camVec);
		
		// -1 dot is behind (frame 0)
		// 1 dot is in front (frame 3)
		int frameID = 0;
		if(orient >= 0.5f)
		{
			frameID = 3;
		}
		else if(orient <= -0.5f)
		{
			frameID = 1;
		}
		else
		{
			var rightVec = Flatten(masterTransform.parent.right);
			if(Vector3.Dot(rightVec, camVec) > 0.0f)
			{
				frameID = 2;
			}
			else
			{
				frameID = 0;
			}
		}
		
		if(frameID != lastFrameID)
		{
			mesh.uv = atlas.GetUVs(spriteID, frameID);
			lastFrameID = frameID;
		}
		
		if(parentSprite == null)
		{
			transform.rotation = cam.rotation;
		}
	}
	
	void LateUpdate()
	{
		if(renderer.isVisible)
		{
			UpdateSprite();
		}
	}
}
