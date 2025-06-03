'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePDFStore } from '@/hooks/usePDFStore';
import ReferenceList from '@/components/analysis/ReferenceList';
import PDFViewer from '@/components/analysis/PDFViewer';
import ChatBot from '@/components/chat/ChatBot';
import FloatingButton from '@/components/ui/FloatingButton';
import { ArrowLeft, Search, BookOpen } from 'lucide-react';
import '../MainScreen.css';

type ViewMode = 'none' | 'references' | 'pdf';

export default function AnalysisPage() {
  const router = useRouter();
  const {
    currentPDF,
    analysisResult,
    selectedReference,
    selectedReference_second_tab,
    setSelectedReference,
    setSelectedReference_second_tab,
    chatMessages,
    isChatOpen,
    toggleChat,
    addChatMessage,
    reset,
    isLoaded,
    setAnalysisResult,
  } = usePDFStore();

  const [viewMode, setViewMode] = useState<ViewMode>('none');

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch("http://localhost:8000/metadata");
        if (!res.ok) {
          throw new Error("Failed to fetch metadata");
        }
        const data = await res.json();
        setAnalysisResult(data); // ✅ zustand 전역 상태 업데이트
      } catch (err) {
        console.error("🛑 메타데이터 로딩 실패:", err);
      }
    };

    // analysisResult가 없을 때만 호출 (중복 방지)
    if (isLoaded && currentPDF && !analysisResult) {
      fetchMetadata();
    }
  }, [isLoaded, currentPDF, analysisResult, setAnalysisResult]);


  // 로딩 중이거나 데이터가 없는 경우 로딩 표시
  if (!isLoaded || !currentPDF || !analysisResult) {
    return (
      <div className="simple-main-screen">
        <div className="header">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">
            {!isLoaded ? '데이터를 로드하고 있습니다...' : '페이지를 이동하고 있습니다...'}
          </p>
        </div>
      </div>
    );
  }

  const handleBackToHome = () => {
    reset();
    router.push('/');
  };

  // 인용 번호 클릭 핸들러
  const handleCitationClick = (
    citationNumber: number,
    options?: { clearReferences?: boolean; keepViewMode?: boolean }
  ) => {
    console.log('🔎 클릭된 citationNumber:', citationNumber);

    const reference = analysisResult.references.find((ref) => {
      const refNumRaw = String(ref.ref_number); // 예: "[1]" 또는 "[1, 2]"
      
      // 정규식으로 숫자들만 추출 → ex: [1, 2]
      const matchedNumbers = refNumRaw.match(/\d+/g)?.map(Number) || [];

      console.log(`📌 ${ref.ref_title} 의 ref_number 추출값:`, matchedNumbers);

      return matchedNumbers.includes(citationNumber);
    });

    if (reference) {
      setSelectedReference_second_tab(reference);
      if (!options?.keepViewMode) setViewMode('pdf');
      if (options?.clearReferences) setSelectedReference(null);
      console.log(`✅ 인용 번호 ${citationNumber} 클릭됨:`, reference.ref_title);
    } else {
      console.warn(`❌ 인용 번호 ${citationNumber}에 해당하는 논문을 찾을 수 없습니다.`);
    }
  };

  const renderRightContent = () => {
    switch (viewMode) {
      case 'references':
        return (
          <div className="content-card">
            <div className="card-header">
              <BookOpen className="card-icon" />
              <h2 className="card-title">참고문헌 목록</h2>
            </div>
            
            <div style={{ 
              flex: 1, 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'row', // 🔁 핵심 수정!
              gap: '1rem' // 🔧 카드 간 간격 추가
            }}>
              {/* 왼쪽: 참고문헌 리스트 */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <ReferenceList
                  references={analysisResult.references}
                  selectedReference={selectedReference}
                  onSelectReference={(ref) => {
                    setSelectedReference(ref);
                    if (viewMode !== 'references') {
                      setViewMode('pdf');
                    }
                  }}
                />
              </div>

              {/* 오른쪽: 상세정보 카드 */}
              {selectedReference && (
                <div style={{
                  flex: 1,
                  padding: '1rem', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#f9fafb',
                  overflowY: 'auto'
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{selectedReference.ref_title}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                    👥 {selectedReference.authors?.join(', ')} | 📅 {selectedReference.year} | 📊 {selectedReference.citation_count?.toLocaleString()}회 인용
                  </p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>
                    {selectedReference.abstract || '초록 정보가 없습니다.'}
                  </p>
                  <div style={{ textAlign: 'right', marginTop: '0.75rem' }}>
                    <button 
                      onClick={() => setSelectedReference(null)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: '#e0e7ff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );


      case 'pdf':
        return (
          <>
            {/* 가운데: PDF 뷰어 */}
            <div className="content-card" style={{ padding: 0 , maxWidth: '100%'}}>
              <div style={{ 
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <PDFViewer
                  pdfFile={currentPDF}
                  isVisible={viewMode === 'pdf'}
                  onCitationClick={(citationNumber) => {
                    handleCitationClick(citationNumber, { clearReferences: true, keepViewMode: true });
                  }}
                />
              </div>
            </div>

            {/* 오른쪽: 선택된 논문 카드 */}
            <div className="content-card">
              <div className="card-header">
                <Search className="card-icon" />
                <h2 className="card-title">논문 정보</h2>
              </div>
              
              <div style={{ 
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {selectedReference_second_tab ? (
                  <div style={{
                    padding: 'clamp(1rem, 2vh, 1.5rem)',
                    background: '#f8fafc',
                    borderRadius: 'clamp(8px, 1vw, 12px)',
                    border: '2px solid #4f46e5'
                  }}>
                    <div style={{
                      marginBottom: 'clamp(1rem, 2vh, 1.5rem)',
                      padding: 'clamp(0.5rem, 1vh, 0.75rem)',
                      background: '#4f46e5',
                      color: 'white',
                      borderRadius: 'clamp(6px, 1vw, 8px)',
                      textAlign: 'center',
                      fontSize: 'clamp(0.875rem, 1.8vw, 1rem)',
                      fontWeight: 600
                    }}>
                      📄 인용 번호 [{selectedReference_second_tab.ref_number}]
                    </div>

                    <h3 style={{
                      fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                      fontWeight: 700,
                      color: '#1e293b',
                      margin: '0 0 clamp(0.75rem, 1.5vh, 1rem) 0',
                      lineHeight: 1.3
                    }}>
                      {selectedReference_second_tab.ref_title}
                    </h3>
                    
                    <div style={{
                      marginBottom: 'clamp(1rem, 2vh, 1.5rem)'
                    }}>
                      <p style={{
                        fontSize: 'clamp(0.875rem, 1.8vw, 1rem)',
                        color: '#475569',
                        margin: '0 0 clamp(0.5rem, 1vh, 0.75rem) 0',
                        fontWeight: 500
                      }}>
                        👥 {selectedReference_second_tab.authors.join(', ')}
                      </p>
                      
                      <div style={{
                        display: 'flex',
                        gap: 'clamp(1rem, 2vw, 1.5rem)',
                        flexWrap: 'wrap',
                        fontSize: 'clamp(0.8rem, 1.6vw, 0.9rem)',
                        color: '#64748b'
                      }}>
                        <span>📅 {selectedReference_second_tab.year}</span>
                        <span>📖 {selectedReference_second_tab.citation_contexts}</span>
                        <span>📊 {selectedReference_second_tab.citation_count.toLocaleString()}회 인용</span>
                      </div>
                    </div>

                    <div style={{
                      background: 'white',
                      padding: 'clamp(1rem, 2vh, 1.5rem)',
                      borderRadius: 'clamp(6px, 1vw, 8px)',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h4 style={{
                        fontSize: 'clamp(0.875rem, 1.8vw, 1rem)',
                        fontWeight: 600,
                        color: '#374151',
                        margin: '0 0 clamp(0.5rem, 1vh, 0.75rem) 0'
                      }}>
                        📝 초록
                      </h4>
                      <p style={{
                        fontSize: 'clamp(0.8rem, 1.6vw, 0.9rem)',
                        color: '#4b5563',
                        lineHeight: 1.6,
                        margin: 0
                      }}>
                        {selectedReference_second_tab.abstract}
                      </p>
                    </div>

                    <div style={{
                      marginTop: 'clamp(1rem, 2vh, 1.5rem)',
                      textAlign: 'center'
                    }}>
                      <button 
                        onClick={() => setSelectedReference_second_tab(null)}
                        style={{
                          padding: 'clamp(0.5rem, 1vh, 0.75rem) clamp(1rem, 2vw, 1.5rem)',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: 'clamp(6px, 1vw, 8px)',
                          fontSize: 'clamp(0.8rem, 1.6vw, 0.9rem)',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 'clamp(0.875rem, 1.8vw, 1rem)',
                    padding: 'clamp(2rem, 5vh, 4rem)'
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        marginBottom: 'clamp(1rem, 2vh, 1.5rem)'
                      }}>
                        🎯
                      </div>
                      <h3 style={{
                        fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                        fontWeight: 600,
                        color: '#64748b',
                        margin: '0 0 clamp(0.5rem, 1vh, 1rem) 0'
                      }}>
                        인용 번호를 클릭하세요
                      </h3>
                      <p style={{ margin: 0, lineHeight: 1.5 }}>
                        PDF에서 파란색 인용 번호<br />
                        <strong>[1], [2], [3]</strong>을 클릭하면<br />
                        여기에 논문 정보가 나타납니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      default:
        return (
          <div className="content-card">
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: 'clamp(0.875rem, 1.8vw, 1rem)',
              padding: 'clamp(2rem, 5vh, 4rem)'
            }}>
              <div>
                <Search style={{ 
                  width: 'clamp(48px, 8vw, 72px)', 
                  height: 'clamp(48px, 8vw, 72px)',
                  margin: '0 auto clamp(1rem, 2vh, 2rem)',
                  display: 'block'
                }} />
                <h3 style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                  fontWeight: 600,
                  color: '#64748b',
                  margin: '0 0 clamp(0.5rem, 1vh, 1rem) 0'
                }}>
                  분석을 시작하세요
                </h3>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  왼쪽에서 참고문헌 목록을 보거나<br />
                  PDF에서 인용 문장을 분석해보세요.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="simple-main-screen">
      {/* 헤더 */}
      <div className="header" style={{ 
        paddingTop: 'clamp(0.5rem, 1vh, 0.75rem)',
        paddingBottom: 'clamp(0.5rem, 1vh, 0.75rem)',
        marginBottom: 'clamp(0.75rem, 1.5vh, 1rem)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 1.5vw, 1rem)', marginBottom: 'clamp(0.4rem, 0.8vh, 0.5rem)' }}>
          <button
            onClick={handleBackToHome}
            className="action-btn secondary"
            style={{ 
              width: 'auto', 
              padding: 'clamp(0.4rem, 0.8vh, 0.5rem) clamp(0.6rem, 1.2vh, 0.8rem)', 
              fontSize: 'clamp(0.75rem, 1.3vw, 0.875rem)',
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0'
            }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px', marginRight: '0.3rem' }} />
            돌아가기
          </button>
        </div>
        
        <h1 className="main-title" style={{ 
          marginBottom: 'clamp(0.3rem, 0.6vh, 0.4rem)',
          fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
          fontWeight: 700,
          lineHeight: 1.1
        }}>분석 결과</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.15rem, 0.3vh, 0.25rem)' }}>
          <p className="main-subtitle" style={{ 
            marginBottom: 'clamp(0.1rem, 0.2vh, 0.2rem)',
            fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
            lineHeight: 1.2
          }}>{currentPDF.name}</p>
          <p style={{ 
            fontSize: 'clamp(0.75rem, 1.3vw, 0.875rem)', 
            color: '#64748b',
            margin: 0,
            lineHeight: 1.2
          }}>
            {analysisResult.references.length}개 논문 인용됨
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 - 3단 레이아웃 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: viewMode === 'pdf' ? '180px 1fr 1fr' : '180px 1fr',
        gap: 'clamp(1.5rem, 3vw, 2rem)',
        maxWidth: 'min(98vw, 1600px)',
        margin: '0 auto',
        width: '100%',
        height: 'calc(100vh - 180px)'
      }}>
        
        {/* 왼쪽 - 좁은 사이드바 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(0.75rem, 1.5vh, 1rem)'
        }}>
          
          {/* 참고문헌 목록 버튼 */}
          <button
            onClick={() => setViewMode('references')}
            style={{
              background: viewMode === 'references' ? '#eef2ff' : 'white',
              border: viewMode === 'references' ? '2px solid #4f46e5' : '1px solid #e5e7eb',
              borderRadius: 'clamp(6px, 1vw, 10px)',
              padding: 'clamp(0.75rem, 1.5vh, 1rem)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'references' 
                ? '0 4px 12px rgba(79, 70, 229, 0.15)' 
                : '0 2px 4px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(0.4rem, 0.8vh, 0.6rem)',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'references') {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== 'references') {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            <BookOpen style={{
              width: 'clamp(18px, 2.5vw, 24px)',
              height: 'clamp(18px, 2.5vw, 24px)',
              color: viewMode === 'references' ? '#4f46e5' : '#64748b'
            }} />
            <div>
              <h3 style={{
                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                fontWeight: 600,
                color: viewMode === 'references' ? '#4f46e5' : '#111827',
                margin: '0 0 clamp(0.2rem, 0.4vh, 0.3rem) 0',
                lineHeight: 1.2
              }}>
                참고문헌
              </h3>
              <p style={{
                fontSize: 'clamp(0.7rem, 1.2vw, 0.8rem)',
                color: '#64748b',
                margin: 0,
                lineHeight: 1.3
              }}>
                {analysisResult.references.length}개
              </p>
            </div>
          </button>

          {/* 인용문장 분석 버튼 */}
          <button
            onClick={() => setViewMode('pdf')}
            style={{
              background: viewMode === 'pdf' ? '#eef2ff' : 'white',
              border: viewMode === 'pdf' ? '2px solid #4f46e5' : '1px solid #e5e7eb',
              borderRadius: 'clamp(6px, 1vw, 10px)',
              padding: 'clamp(0.75rem, 1.5vh, 1rem)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: viewMode === 'pdf' 
                ? '0 4px 12px rgba(79, 70, 229, 0.15)' 
                : '0 2px 4px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(0.4rem, 0.8vh, 0.6rem)',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'pdf') {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== 'pdf') {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            <Search style={{
              width: 'clamp(18px, 2.5vw, 24px)',
              height: 'clamp(18px, 2.5vw, 24px)',
              color: viewMode === 'pdf' ? '#4f46e5' : '#64748b'
            }} />
            <div>
              <h3 style={{
                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                fontWeight: 600,
                color: viewMode === 'pdf' ? '#4f46e5' : '#111827',
                margin: '0 0 clamp(0.2rem, 0.4vh, 0.3rem) 0',
                lineHeight: 1.2
              }}>
                인용분석
              </h3>
              <p style={{
                fontSize: 'clamp(0.7rem, 1.2vw, 0.8rem)',
                color: '#64748b',
                margin: 0,
                lineHeight: 1.3
              }}>
                PDF 분석
              </p>
            </div>
          </button>
        </div>

        {/* 오른쪽 - 동적 콘텐츠 */}
        {renderRightContent()}
      </div>

      {/* Chat Bot */}
      <ChatBot
        isOpen={isChatOpen}
        onClose={toggleChat}
        messages={chatMessages}
        onSendMessage={addChatMessage}
      />

      {/* Floating Chat Button */}
      <FloatingButton onClick={toggleChat} />
    </div>
  );
} 