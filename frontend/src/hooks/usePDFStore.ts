'use client';

import { useState, useCallback, useEffect } from 'react';
import { PDFFile, AnalysisResult, Reference, ChatMessage } from '@/types';
import { generateId } from '@/lib/utils';
import { 
  savePDFToStorage, 
  loadPDFFromStorage, 
  saveAnalysisToStorage, 
  loadAnalysisFromStorage,
  clearStorageData 
} from '@/lib/storage';

export function usePDFStore() {
  const [currentPDF, setCurrentPDF] = useState<PDFFile | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [selectedReference_second_tab, setSelectedReference_second_tab] = useState<Reference | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 컴포넌트 마운트 시 localStorage에서 데이터 복원
  useEffect(() => {
    console.log('usePDFStore 초기화 - localStorage에서 데이터 로드 중...');
    
    // 기존 데이터 형식과 호환성 문제로 한 번 클리어 (개발 중에만)
    const hasOldFormat = localStorage.getItem('refnavi_pdf_file');
    if (hasOldFormat) {
      try {
        const oldData = JSON.parse(hasOldFormat);
        if (!oldData.data) {
          console.log('🔄 구 형식 데이터 감지 - localStorage 클리어');
          clearStorageData();
        }
      } catch (e) {
        console.log('🔄 잘못된 데이터 형식 - localStorage 클리어:', e);
        clearStorageData();
      }
    }
    
    const storedPDF = loadPDFFromStorage();
    const storedAnalysis = loadAnalysisFromStorage();
    
    if (storedPDF) {
      setCurrentPDF(storedPDF);
      console.log('✅ 저장된 PDF 복원됨:', storedPDF.name, '(실제 데이터 포함)');
    }
    
    if (storedAnalysis) {
      setAnalysisResult(storedAnalysis);
      console.log('✅ 저장된 분석 결과 복원됨');
    }
    
    setIsLoaded(true);
  }, []);

  const uploadPDF = useCallback((file: File) => {
    console.log('usePDFStore.uploadPDF 호출됨:', file.name);
    
    const pdfFile: PDFFile = {
      file,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedAt: new Date(),
    };
    
    console.log('PDFFile 객체 생성:', pdfFile);
    setCurrentPDF(pdfFile);
    
    // localStorage에 저장
    savePDFToStorage(pdfFile);
    console.log('setCurrentPDF 및 localStorage 저장 완료');
  }, []);

  const startAnalysis = useCallback(async () => {
    if (!currentPDF) return;

    setIsAnalyzing(true);

    try {
      // FormData로 파일 포장
      const formData = new FormData();
      formData.append('file', currentPDF.file);

      console.log('📤 PDF 업로드 시작:', currentPDF.name);

      // PDF 업로드 및 분석 요청
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('서버 응답:', response.status, errorText);
        throw new Error(`파일 업로드 및 분석 실패 (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('📄 분석 결과 수신:', result);

      // 상태 및 localStorage에 저장
      setAnalysisResult(result);
      saveAnalysisToStorage(result);
    } catch (err) {
      console.error('❌ 분석 실패:', err);
      alert('분석 중 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentPDF]);


  const addChatMessage = useCallback((content: string, type: 'user' | 'assistant' = 'user') => {
    const message: ChatMessage = {
      id: generateId(),
      type,
      content,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, message]);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  const togglePDFViewer = useCallback(() => {
    setShowPDFViewer(prev => !prev);
  }, []);

  const reset = useCallback(() => {
    setCurrentPDF(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setSelectedReference(null);
    setSelectedReference_second_tab(null);
    setChatMessages([]);
    setIsChatOpen(false);
    setShowPDFViewer(false);
    
    // localStorage도 클리어
    clearStorageData();
    console.log('모든 상태 및 localStorage 클리어됨');
  }, []);

  return {
    // State
    currentPDF,
    analysisResult,
    isAnalyzing,
    selectedReference,
    selectedReference_second_tab,
    chatMessages,
    isChatOpen,
    showPDFViewer,
    isLoaded, // 초기 로딩 완료 여부
    
    // Actions
    uploadPDF,
    startAnalysis,
    setSelectedReference,
    setSelectedReference_second_tab,
    addChatMessage,
    toggleChat,
    togglePDFViewer,
    reset,

    setAnalysisResult,
  };
} 