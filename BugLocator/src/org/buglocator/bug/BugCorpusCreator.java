package org.buglocator.bug;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.buglocator.property.Property;
import org.buglocator.utils.Splitter;
import org.buglocator.utils.Stem;
import org.buglocator.utils.Stopword;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.*;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
//import java.util.Comparator;

public class BugCorpusCreator {

	private final String workDir = Property.getInstance().WorkDir;
	private final String pathSeperator = Property.getInstance().Separator;
	private final String lineSeperator = Property.getInstance().LineSeparator;

	// class BugComparator implements Comparator<Bug>{
	// @Override
	// public int compare(Bug a, Bug b) {
	// if(a.getOpenDate().after(b.getOpenDate()))
	// return 1;
	// else if(a.getOpenDate().before(b.getOpenDate()))
	// return -1;
	// else
	// return 0;
	//
	// }
	// }
	/**
	 * �����Լ�
	 * 
	 * @throws IOException
	 */
	public void create() throws IOException {
		// Create Temp Directory
		String dirPath = workDir + this.pathSeperator + "BugCorpus" + this.pathSeperator;
		File dirObj = new File(dirPath);
		if (!dirObj.exists())
			dirObj.mkdirs();

		// Create Corpus and Sort
		ArrayList<Bug> list = this.parseXML();
		// list.sort(new BugComparator()); // fixed date �� ���ĵǾ� ����

		// Corpus Store
		Property.getInstance().BugReportCount = list.size();
		for (Bug bug : list) {
			writeCorpus(bug, dirPath);
		}

		// summarize corpus information.
		FileWriter writer = new FileWriter(this.workDir + this.pathSeperator + "SortedId.txt");
		FileWriter writerFix = new FileWriter(this.workDir + this.pathSeperator + "FixLink.txt");

		for (Bug bug : list) {
			// XML�� bug����Ʈ�� fixed_date�� ���ĵǾ��־ ���� ����
			writer.write(bug.getBugId() + "\t" + bug.getFixDate() + this.lineSeperator);
			writer.flush();

			for (String fixName : bug.set) {
				writerFix.write(bug.getBugId() + "\t" + fixName + this.lineSeperator);
				writerFix.flush();

			}
		}
		writer.close();
		writerFix.close();
	}

	public Date makeTime(String time) {
		SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss");

		Date date = null;
		try {
			date = formatter.parse(time);
		} catch (Exception e) {
			long ltime = Long.parseLong(time);
			date = new Date(ltime);
		}

		return date;
	}

	/**
	 * ������ ��������(XML)�� ���� �ε�.
	 * XML������ �������� ���׸���Ʈ�� �ϳ��� ������ ������ ����.
	 * 
	 * @return
	 */
//	private ArrayList<Bug> parseXML() {
//		ArrayList<Bug> list = new ArrayList<Bug>();
//		DocumentBuilderFactory domFactory = DocumentBuilderFactory.newInstance();
//		try {
//			DocumentBuilder domBuilder = domFactory.newDocumentBuilder();
//			System.out.println(Property.getInstance().BugFilePath);
//			InputStream is = new FileInputStream(Property.getInstance().BugFilePath);
//			Document doc = domBuilder.parse(is);
//			Element root = doc.getDocumentElement();
//			NodeList tables = root.getElementsByTagName("table");
//
//			for (int i = 0; i < tables.getLength(); i++) {
//				Element table = (Element) tables.item(i);
//				if ("aspectj".equals(table.getAttribute("name"))) {
//					Bug bug = new Bug();
//					NodeList columns = table.getElementsByTagName("column");
//
//					for (int j = 0; j < columns.getLength(); j++) {
//						Element column = (Element) columns.item(j);
//						String name = column.getAttribute("name");
//						String value = column.getTextContent();
//
//						switch (name) {
//							case "bug_id":
//								bug.setBugId(value);
//								break;
//							case "summary":
//								bug.setBugSummary(value);
//								break;
//							case "description":
//								bug.setBugDescription(value);
//								break;
//							case "report_time":
//								bug.setOpenDate(makeTime(value));
//								break;
//							case "commit_timestamp":
//								bug.setFixDate(makeTime(value));
//								break;
//							case "files":
//								String[] files = value.split(",");
//								for (String file : files) {
//									bug.addFixedFile(file.trim());
//								}
//								break;
//						}
//					}
//					list.add(bug);
//				}
//			}
//		} catch (Exception ex) {
//			ex.printStackTrace();
//		}
//		return list;
//	}
	private ArrayList<Bug> parseXML() {
		ArrayList<Bug> list = new ArrayList<Bug>();
		DocumentBuilderFactory domFactory = DocumentBuilderFactory.newInstance();
		try {
			DocumentBuilder domBuilder = domFactory.newDocumentBuilder();
			System.out.println(Property.getInstance().BugFilePath);
			InputStream is = new FileInputStream(Property.getInstance().BugFilePath);

			Document doc = domBuilder.parse(is);
			Element root = doc.getDocumentElement();
			NodeList tables = root.getElementsByTagName("table");

			for (int i = 0; i < tables.getLength(); i++) {
				Element table = (Element) tables.item(i);

				// No more checking for a specific table name, handle all tables
				Bug bug = new Bug();
				NodeList columns = table.getElementsByTagName("column");

				for (int j = 0; j < columns.getLength(); j++) {
					Element column = (Element) columns.item(j);
					String name = column.getAttribute("name");
					String value = column.getTextContent();

					switch (name) {
						case "bug_id":
							bug.setBugId(value);
							break;
						case "summary":
							bug.setBugSummary(value);
							break;
						case "description":
							bug.setBugDescription(value);
							break;
						case "report_time":
							bug.setOpenDate(makeTime(value));
							break;
						case "commit_timestamp":
							bug.setFixDate(makeTime(value));
							break;
						case "files":
							String[] files = value.split(",");
							for (String file : files) {
								bug.addFixedFile(file.trim());
							}
							break;
					}
				}
				list.add(bug);
			}
		} catch (Exception ex) {
			ex.printStackTrace();
		}
		return list;
	}

	/**
	 * ���� corpus�� ���Ͽ� ���
	 * 
	 * @param bug
	 * @param storeDir
	 * @throws IOException
	 */
	private void writeCorpus(Bug bug, String storeDir) throws IOException {

		// split words from bug content (summary + description)
		String content = bug.getBugSummary() + " " + bug.getBugDescription();
		String[] splitWords = Splitter.splitNatureLanguage(content);

		// concatenate words in bug
		StringBuffer corpus = new StringBuffer();
		for (String word : splitWords) {
			word = Stem.stem(word.toLowerCase());
			if (!Stopword.isEnglishStopword(word)) {
				corpus.append(word + " ");
			}
		}

		// save corpus.
		FileWriter writer = new FileWriter(storeDir + bug.getBugId() + ".txt");
		writer.write(corpus.toString().trim());
		writer.flush();
		writer.close();

	}

}
