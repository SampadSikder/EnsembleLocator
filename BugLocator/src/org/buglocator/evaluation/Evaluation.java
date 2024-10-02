package org.buglocator.evaluation;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Hashtable;
import java.util.Iterator;
import java.util.TreeSet;

import org.buglocator.property.Property;

public class Evaluation {
	private String workDir = Property.getInstance().WorkDir + Property.getInstance().Separator;
	private String outputFile = Property.getInstance().OutputFile;
	private int fileCount = Property.getInstance().FileCount;
	private int bugCount = Property.getInstance().BugReportCount;
	private float alpha = Property.getInstance().Alpha;
	private String lineSeparator = Property.getInstance().LineSeparator;
	private String recommendedPath =  Property.getInstance().WorkDir + Property.getInstance().Separator+ "recommended" +Property.getInstance().Separator;

	Hashtable<String, Integer> idTable = null;
	Hashtable<Integer, String> nameTable = null;
	Hashtable<Integer, TreeSet<String>> fixTable = null;
	Hashtable<String, Double> lenTable = null;
	
	FileWriter outputWriter;

	public Evaluation() {
		try {
			this.idTable = getFileId();
			this.lenTable = getLenScore();
			this.nameTable = getClassNames();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	public FileWriter errorWriter = null;
	public void evaluate() throws IOException {
		BufferedReader VSMReader = new BufferedReader(new FileReader(this.workDir + "VSMScore.txt"));
		errorWriter = new FileWriter(this.workDir + "Evaluator-NoMatch.txt");
		outputWriter = new FileWriter(this.outputFile);
		File resultDir = new File(recommendedPath);
		if (!resultDir.exists())
			resultDir.mkdirs();

		for (int count = 0; count < bugCount; count++) {
			// Create VSM vector
			String vsmLine = VSMReader.readLine();
			String vsmIdStr = vsmLine.substring(0, vsmLine.indexOf(";"));
			Integer bugID = Integer.parseInt(vsmIdStr);
			String vsmVectorStr = vsmLine.substring(vsmLine.indexOf(";") + 1);
			float[] vsmVector = getVector(vsmVectorStr);

			// multiply length values
			for (String key : lenTable.keySet()) {
				Integer id = idTable.get(key);
				Double score = lenTable.get(key);
				vsmVector[id] *= score.floatValue();
			}
			vsmVector = normalize(vsmVector);

			// Print Evaluation Result
			this.printEvaluationResult(bugID, vsmVector);
		}
		VSMReader.close();
		errorWriter.close();
		outputWriter.close();
	}
	public void printEvaluationResult(Integer _bugID, float[] _finalscore) throws IOException {
		// Score에 따라 정렬된 순위를 가져옴
		Rank[] sortedRank = getSortedRank(_finalscore);

		// 결과를 파일에 기록 (추천된 파일 전체를 기록함)
		FileWriter writer = new FileWriter(recommendedPath + _bugID + ".txt");
		for (int i = 0; i < sortedRank.length; i++) {
			Rank rank = sortedRank[i];
			if(nameTable.containsKey(rank.id)) {
				writer.write(i + "\t" + rank.rank + "\t" + nameTable.get(rank.id) + this.lineSeparator);
				outputWriter.write(_bugID + "\t" + nameTable.get(rank.id) + "\t" + i + "\t" + rank.rank + this.lineSeparator);
			}
		}
		writer.close();
		outputWriter.flush();
	}
	/**
	 * 
	 * @return
	 * @throws IOException
	 */
	public Hashtable<String, Integer> getFileId() throws IOException {
		BufferedReader reader = new BufferedReader(new FileReader(this.workDir + "ClassName.txt"));
		String line = null;
		Hashtable<String, Integer> table = new Hashtable<String, Integer>();
		while ((line = reader.readLine()) != null) {
			String[] values = line.split("\t");
			Integer idInteger = Integer.valueOf(Integer.parseInt(values[0]));
			String nameString = values[1].trim();
			table.put(nameString, idInteger);
		}
		reader.close();
		return table;
	}
	
	/**
	 * 
	 * @return
	 * @throws IOException
	 */
	public Hashtable<Integer, String> getClassNames() throws IOException {
		BufferedReader reader = new BufferedReader(new FileReader(this.workDir + "ClassName.txt"));
		String line = null;
		Hashtable<Integer, String> table = new Hashtable<Integer, String>();
		while ((line = reader.readLine()) != null) {
			String[] values = line.split("\t");
			Integer idInteger = Integer.valueOf(Integer.parseInt(values[0]));
			String nameString = values[1].trim();
			table.put(idInteger, nameString);
		}
		reader.close();
		return table;
	}

	/**
	 * 
	 * @return
	 * @throws IOException
	 */
	public Hashtable<Integer, String> getFile() throws IOException {
		BufferedReader reader = new BufferedReader(new FileReader(this.workDir + "ClassName.txt"));
		String line = null;
		Hashtable<Integer, String> table = new Hashtable<Integer, String>();
		while ((line = reader.readLine()) != null) {
			String[] values = line.split("\t");
			Integer idInteger = Integer.valueOf(Integer.parseInt(values[0]));
			String nameString = values[1].trim();
			table.put(idInteger, nameString);
		}
		reader.close();
		return table;
	}

	public Hashtable<Integer, TreeSet<String>> getFixLinkTable() throws IOException {
		BufferedReader reader = new BufferedReader(new FileReader(this.workDir + "FixLink.txt"));
		String line = null;
		Hashtable<Integer, TreeSet<String>> table = new Hashtable<Integer, TreeSet<String>>();
		while ((line = reader.readLine()) != null) {
			String[] valueStrings = line.split("\t");
			Integer id = Integer.parseInt(valueStrings[0]);
			String fileName = valueStrings[1].trim();
			if (!table.containsKey(id)) {
				table.put(id, new TreeSet<String>());
			}
			table.get(id).add(fileName);
		}
		reader.close();
		return table;
	}

//	private Rank[] getSortedRank(float[] finalR) {
//		Rank[] R = new Rank[finalR.length];
//		for (int i = 0; i < R.length; i++) {
//			R[i] = new Rank();
//			R[i].rank = finalR[i];
//			R[i].id = i;
//		}
//		R = insertionSort(R);
//		return R;
//	}
//
//	private Rank[] insertionSort(Rank[] R) {
//		for (int i = 0; i < R.length; i++) {
//			int maxIndex = i;
//			for (int j = i; j < R.length; j++) {
//				if (R[j].rank > R[maxIndex].rank) {
//					maxIndex = j;
//				}
//			}
//			Rank tmpRank = R[i];
//			R[i] = R[maxIndex];
//			R[maxIndex] = tmpRank;
//		}
//		return R;
//	}

	public float[] combine(float[] vsmVector, float[] graphVector, float f) {
		float[] results = new float[this.fileCount];
		for (int i = 0; i < this.fileCount; i++) {
			results[i] = (vsmVector[i] * (1.0F - f) + graphVector[i] * f);
		}
		return results;
	}


	private Rank[] getSortedRank(float[] finalR) {
		Rank[] R = new Rank[finalR.length];
		for (int i = 0; i < R.length; i++) {
			R[i] = new Rank();
			R[i].rank = finalR[i];
			R[i].id = i;
		}
		R = insertionSort(R);
		return R;
	}

	private Rank[] insertionSort(Rank[] R) {
		for (int i = 0; i < R.length; i++) {
			int maxIndex = i;
			for (int j = i; j < R.length; j++) {
				if (R[j].rank > R[maxIndex].rank) {
					maxIndex = j;
				}
			}
			Rank tmpRank = R[i];
			R[i] = R[maxIndex];
			R[maxIndex] = tmpRank;
		}
		return R;
	}

	private float[] normalize(float[] array) {
		float max = Float.MIN_VALUE;
		float min = Float.MAX_VALUE;
		for (int i = 0; i < array.length; i++) {
			if (max < array[i])
				max = array[i];
			if (min > array[i])
				min = array[i];
		}
		float span = max - min;
		for (int i = 0; i < array.length; i++) {
			array[i] = ((array[i] - min) / span);
		}
		return array;
	}

	private float[] getVector(String vectorStr) {
		float[] vector = new float[this.fileCount];
		String[] values = vectorStr.split(" ");

		for (String value : values) {
			String[] singleValues = value.split(":");
			if (singleValues.length == 2) {
				int index = Integer.parseInt(singleValues[0]);
				float sim = Float.parseFloat(singleValues[1]);
				vector[index] = sim;
			}
		}
		return vector;
	}

//	private float[] normalize(float[] array) {
//		float max = Float.MIN_VALUE;
//		float min = Float.MAX_VALUE;
//		for (int i = 0; i < array.length; i++) {
//			if (max < array[i])
//				max = array[i];
//			if (min > array[i])
//				min = array[i];
//		}
//		float span = max - min;
//		for (int i = 0; i < array.length; i++) {
//			array[i] = ((array[i] - min) / span);
//		}
//		return array;
//	}

//	private float[] getVector(String vectorStr) {
//		float[] vector = new float[this.fileCount];
//		String[] values = vectorStr.split(" ");
//
//		for (String value : values) {
//			String[] singleValues = value.split(":");
//			if (singleValues.length == 2) {
//				int index = Integer.parseInt(singleValues[0]);
//
//				float sim = Float.parseFloat(singleValues[1]);
//				vector[index] = sim;
//			}
//		}
//		return vector;
//	}

	private Hashtable<String, Double> getLenScore() throws IOException {
		BufferedReader reader = new BufferedReader(new FileReader(this.workDir + "LengthScore.txt"));
		String line = null;
		Hashtable<String, Double> lenTable = new Hashtable<String, Double>();
		while ((line = reader.readLine()) != null) {
			String[] values = line.split("\t");
			String name = values[0];
			Double score = Double.valueOf(Double.parseDouble(values[1]));
			lenTable.put(name, score);
		}
		reader.close();
		return lenTable;
	}
}