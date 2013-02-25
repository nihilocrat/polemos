using UnityEngine;
using System.Collections;

public class ProjectileSprite : MonoBehaviour
{
	public int spriteID = 0;
	
	private Mesh mesh;
	private SpriteAtlas atlas;
	
	void Awake ()
	{
		mesh = GetComponent<MeshFilter>().mesh;
		atlas = FindObjectOfType(typeof(SpriteAtlas)) as SpriteAtlas;
		
		mesh.uv = atlas.GetUVs(spriteID, 0);
	}
}
