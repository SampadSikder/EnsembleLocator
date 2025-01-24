package org.buglocator.sourcecode;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.ParseException;
import java.util.TreeSet;
import org.buglocator.property.Property;
import org.buglocator.sourcecode.ast.Corpus;
import org.buglocator.sourcecode.ast.FileDetector;
import org.buglocator.sourcecode.ast.FileParser;
import org.buglocator.utils.Stem;
import org.buglocator.utils.Stopword;

public class CodeCorpusCreator
{
	private final String workDir = Property.getInstance().WorkDir;
	private final String codePath = Property.getInstance().SourceCodeDir;
	private final String pathSeparator = Property.getInstance().Separator;
	private final String lineSeparator = Property.getInstance().LineSeparator;
	private final String projectName = Property.getInstance().ProjectName;
	
	public CodeCorpusCreator() throws IOException, ParseException
	{}
	
	/**
	 * ���� �Լ�.
	 * @throws Exception
	 */
	public void create() throws Exception
	{
		int count = 0;
		TreeSet<String> nameSet = new TreeSet<String>();
		
		//File listing
		FileDetector detector = new FileDetector("java"); // java file Filter
		File[] files = detector.detect(codePath);
		
		//preparing output File.
		FileWriter writeCorpus = new FileWriter(workDir + pathSeparator + "CodeCorpus.txt");
		FileWriter writer = new FileWriter(workDir + pathSeparator + "ClassName.txt");
		
		//make corpus each file
		for (File file: files) {
			Corpus corpus = this.create(file);	//Corpus ����.
			if (corpus == null)	continue;
			
			//file filtering  (�ߺ�����)
			String FullClassName = corpus.getJavaFileFullClassName();
			if (projectName.startsWith("ASPECTJ")){
				FullClassName = file.getPath().substring(codePath.length()); //��θ��� ���� �ν�.
				FullClassName = FullClassName.replace("\\", "/");
				if (FullClassName.startsWith("/")) 
					FullClassName = FullClassName.substring(1); //��θ��� ���� �ν�.
				
			}
			if (nameSet.contains(FullClassName)) continue;
			
		
			//Write File.
			if (!FullClassName.endsWith(".java"))	FullClassName +=  ".java";
			writer.write(count + "\t" + FullClassName + this.lineSeparator);
			writeCorpus.write(FullClassName + "\t" + corpus.getContent() + this.lineSeparator);
			writer.flush();
			writeCorpus.flush();
			
			//Update Filter			
			nameSet.add(FullClassName); //corpus.getJavaFileFullClassName());
			count++;
		}
		Property.getInstance().FileCount = count;
		writeCorpus.close();
		writer.close();

	}
	
	/**
	 * �� ���Ͽ� ���ؼ� corpus�� ����
	 * @param file
	 * @return
	 */
	public Corpus create(File file) {
		FileParser parser = new FileParser(file);

		// Extract file name
		String fileName = parser.getPackageName();
		if (fileName.trim().isEmpty()) {
			fileName = file.getName();
		} else {
			fileName = fileName + "." + file.getName();
		}

		// Ensure safe substring operation to remove file extension
		int lastDotIndex = fileName.lastIndexOf(".");
		if (lastDotIndex > 0) {
			fileName = fileName.substring(0, lastDotIndex);
		}

		// Process content - stemming and removing stopwords
		String[] content = parser.getContent();
		StringBuilder contentBuf = new StringBuilder();
		for (String word : content) {
			String stemWord = Stem.stem(word.toLowerCase());
			if ((!Stopword.isKeyword(word)) && (!Stopword.isEnglishStopword(word))) {
				contentBuf.append(stemWord).append(" ");
			}
		}
		String sourceCodeContent = contentBuf.toString();

		// Extract class and method names
		String[] classNameAndMethodName = parser.getClassNameAndMethodName();
		StringBuilder nameBuf = new StringBuilder();
		for (String word : classNameAndMethodName) {
			String stemWord = Stem.stem(word.toLowerCase());
			nameBuf.append(stemWord).append(" ");
		}
		String names = nameBuf.toString();

		// Create Corpus object
		Corpus corpus = new Corpus();
		corpus.setJavaFilePath(file.getAbsolutePath());
		corpus.setJavaFileFullClassName(fileName);
		corpus.setContent(sourceCodeContent + " " + names);

		return corpus;
	}

}
