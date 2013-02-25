using UnityEngine;
using System.Collections;

public class SpriteAtlas : MonoBehaviour
{
	public int spriteSize = 8;
	public int spriteFrames = 4;
	public Material atlas;
	
	private int width = 256;
	private int height = 256;
	private int spritesPerRow = 1;
	private float uwidth = 0.1f;
	private float vheight = 0.1f;
	
	void Awake()
	{
		width = atlas.mainTexture.width;
		height = atlas.mainTexture.height;
		uwidth = (float)spriteSize / width;
		vheight = (float)spriteSize / height;
		spritesPerRow = width / (spriteSize * spriteFrames);
	}
	
	public Vector2[] GetUVs(int spriteID, int frameID)
	{
		int row = Mathf.FloorToInt((float)spriteID / (float)spritesPerRow);
		int col = (spriteID - (row * spritesPerRow)) * spriteFrames;
		col += frameID;
		
		// based on the way the coord translation works, add a little offset
		row += 1;
		
		float uleft = (float)(col * spriteSize) / (float)width;
		float vtop = 1.0f - ((float)(row * spriteSize) / (float)height);
		
		uleft = Mathf.Clamp(uleft, 0.0f, 1.0f);
		vtop = Mathf.Clamp(vtop, 0.0f, 1.0f);
		
		// UVs are : 1,0 ; 0,1; 1,1 ; 0,0 x 4
		var newUVs = new Vector2[]
		{
			new Vector2(uleft + uwidth, vtop),
			new Vector2(uleft, vtop + vheight),
			new Vector2(uleft + uwidth, vtop + vheight),
			new Vector2(uleft, vtop),
			new Vector2(uleft, vtop),
			new Vector2(uleft, vtop),
			new Vector2(uleft, vtop)
			//new Vector2(uleft, vtop)
		};
		
		return newUVs;
	}
}
