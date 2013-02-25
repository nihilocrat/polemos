using System.IO;
using UnityEngine;

public class CSVReader {
	public static string[] read(string filename) {
		string fileContents = "";
		string localPath = Utils.DataPath + filename + ".txt";
		
		if(File.Exists(localPath))
		{
			StreamReader sr = new StreamReader(localPath);
			fileContents = sr.ReadToEnd();
			sr.Close();
		}
		else
		{
			var file = Resources.Load("Data/" + filename) as TextAsset;
			if(file == null)
			{
				Debug.LogError("Can't open text asset '" + filename + "'");
			}
			fileContents = file.text;
		}

		string[] lines = fileContents.Split("\n"[0]);
		return lines;
	}
}