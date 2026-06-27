import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { RefreshCw, Trophy, AlertTriangle, Trash2, Monitor, LayoutGrid, Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

const ElectionResults = ({ electionId }) => {
    const [aggregatedResults, setAggregatedResults] = useState([]);
    const [boothWiseResults, setBoothWiseResults] = useState([]);
    const [positions, setPositions] = useState([]);
    const [electionStatus, setElectionStatus] = useState('NOT_STARTED');
    const [showResultsPublicly, setShowResultsPublicly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [activeTab, setActiveTab] = useState('position'); // 'position' or 'booth'

    const fetchData = async () => {
        if (!electionId) return;
        try {
            const [resultsRes, statusRes, positionsRes] = await Promise.all([
                api.get(`/vote/results?electionId=${electionId}`),
                api.get(`/election/${electionId}`),
                api.get(`/positions?electionId=${electionId}`)
            ]);

            setAggregatedResults(resultsRes.data.aggregated || []);
            setBoothWiseResults(resultsRes.data.boothWise || []);
            setElectionStatus(statusRes.data.status);
            setShowResultsPublicly(statusRes.data.showResultsPublicly || false);
            setPositions(positionsRes.data);
            setLastUpdated(new Date());
            setLoading(false);
        } catch (err) {
            console.error("Error fetching data:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [electionId]);

    const handleTogglePublicResults = async () => {
        try {
            const nextVal = !showResultsPublicly;
            await api.put(`/election/${electionId}`, { showResultsPublicly: nextVal });
            setShowResultsPublicly(nextVal);
        } catch (err) {
            console.error("Failed to toggle public results:", err);
            alert("Failed to update public results settings.");
        }
    };

    const handleResetResults = async () => {
        if (!window.confirm("Are you sure you want to RESET all system results? This action clears all votes across ALL booths and cannot be undone.")) {
            return;
        }

        try {
            await api.post(`/election/${electionId}/reset`);
            fetchData();
        } catch (err) {
            console.error("Failed to reset results:", err);
            alert("Failed to reset results.");
        }
    };

    const handleDownloadCSV = () => {
        let csvRows = [];
        
        // Title
        csvRows.push('"ELECTION RESULTS REPORT"');
        csvRows.push(`"Generated At","${lastUpdated.toLocaleString().replace(/"/g, '""')}"`);
        csvRows.push(`"Election Status","${electionStatus.replace(/"/g, '""')}"`);
        csvRows.push("");
        
        // Combined Results Section
        csvRows.push('"--- COMBINED RESULTS BY POSITION ---"');
        csvRows.push('"Position","Candidate","Votes","Percentage","Winner Status"');
        
        positions.forEach(pos => {
            const candidates = (pos.candidates || []).map(c => {
                const resCand = aggregatedResults.find(r => r.id === c.id);
                return { ...c, votes: resCand ? resCand.votes : 0 };
            });
            const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
            
            // Group and sort candidates to determine winner status
            const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);
            const maxVotes = sortedCandidates.length > 0 ? sortedCandidates[0].votes : 0;

            sortedCandidates.forEach(c => {
                const percentage = candidates.length === 1 ? 100 : (totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0);
                const isWinner = c.votes > 0 && c.votes === maxVotes;
                const winnerText = candidates.length === 1 ? "Declared Winner (Unopposed)" : (isWinner ? "Winner" : "");
                
                // Escape quotes/commas in CSV values
                const escapedPos = `"${pos.title.replace(/"/g, '""')}"`;
                const escapedName = `"${c.name.replace(/"/g, '""')}"`;
                const escapedPercentage = `"${percentage}%"`;
                const escapedWinnerText = `"${winnerText.replace(/"/g, '""')}"`;
                
                csvRows.push(`${escapedPos},${escapedName},${c.votes},${escapedPercentage},${escapedWinnerText}`);
            });
        });
        
        csvRows.push("");
        
        // Booth Breakdown Section
        csvRows.push('"--- BOOTH BREAKDOWN ---"');
        csvRows.push('"Booth Name","Booth ID","Position","Candidate","Votes"');
        
        boothWiseResults.forEach(booth => {
            const escapedBoothName = `"${booth.boothName.replace(/"/g, '""')}"`;
            const escapedBoothId = `"${booth.boothId.replace(/"/g, '""')}"`;
            
            booth.positions.forEach(pos => {
                const escapedPos = `"${pos.title.replace(/"/g, '""')}"`;
                pos.candidates.forEach(c => {
                    const escapedName = `"${c.name.replace(/"/g, '""')}"`;
                    csvRows.push(`${escapedBoothName},${escapedBoothId},${escapedPos},${escapedName},${c.votes}`);
                });
            });
        });
        
        const csvString = csvRows.join("\n");
        const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `election_results_${electionId}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        let pageNum = 1;
        
        const drawHeader = () => {
            // Draw slate-900 top banner
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text("ELECTION RESULTS REPORT", 20, 26);
        };

        const drawFooter = () => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${pageNum}`, pageWidth - 30, pageHeight - 15);
            doc.text(`Generated on ${lastUpdated.toLocaleString()}`, 20, pageHeight - 15);
        };

        drawHeader();
        drawFooter();
        
        let yPos = 50;
        
        positions.forEach(pos => {
            // Check space required for a position (title + header + candidate rows + spacing)
            const candidates = (pos.candidates || []).map(c => {
                const resCand = aggregatedResults.find(r => r.id === c.id);
                return { ...c, votes: resCand ? resCand.votes : 0 };
            });
            const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
            const rowCount = candidates.length || 1;
            const requiredHeight = 15 + (rowCount * 10) + 15;
            
            if (yPos + requiredHeight > pageHeight - 25) {
                doc.addPage();
                pageNum++;
                drawHeader();
                drawFooter();
                yPos = 55; // Reset top margin for new page
            }
            
            // Draw Position Container Header
            doc.setFillColor(30, 41, 59); // slate-800
            doc.rect(20, yPos, pageWidth - 40, 10, 'F');
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.text(`${pos.title.toUpperCase()}`, 25, yPos + 7);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(203, 213, 225); // slate-300
            doc.text(`Total Votes: ${totalVotes}`, pageWidth - 60, yPos + 7);
            
            yPos += 10;
            
            // Draw Table Column Headers
            doc.setFillColor(241, 245, 249); // slate-100
            doc.rect(20, yPos, pageWidth - 40, 8, 'F');
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text("Candidate Name", 25, yPos + 6);
            doc.text("Votes", 110, yPos + 6);
            doc.text("Percentage", 140, yPos + 6);
            doc.text("Winner Status", 165, yPos + 6);
            
            yPos += 8;
            
            // Draw Rows
            const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);
            const maxVotes = sortedCandidates.length > 0 ? sortedCandidates[0].votes : 0;
            
            if (sortedCandidates.length === 0) {
                // No candidates row
                doc.setDrawColor(226, 232, 240);
                doc.line(20, yPos + 8, pageWidth - 20, yPos + 8);
                doc.setFont("helvetica", "italic");
                doc.setFontSize(10);
                doc.setTextColor(148, 163, 184);
                doc.text("No candidates registered for this position.", 25, yPos + 6);
                yPos += 10;
            } else {
                sortedCandidates.forEach((c, idx) => {
                    const percentage = candidates.length === 1 ? 100 : (totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0);
                    const isWinner = c.votes > 0 && c.votes === maxVotes;
                    
                    // Alternating background for rows
                    if (idx % 2 === 1) {
                        doc.setFillColor(248, 250, 252); // slate-50
                        doc.rect(20, yPos, pageWidth - 40, 8, 'F');
                    }
                    
                    // Border line under row
                    doc.setDrawColor(241, 245, 249);
                    doc.setLineWidth(0.5);
                    doc.line(20, yPos + 8, pageWidth - 20, yPos + 8);
                    
                    // Text styling
                    doc.setFont("helvetica", isWinner ? "bold" : "normal");
                    doc.setFontSize(10);
                    if (isWinner) {
                        doc.setTextColor(15, 23, 42); // slate-900
                    } else {
                        doc.setTextColor(51, 65, 85); // slate-700
                    }
                    
                    doc.text(c.name, 25, yPos + 5.5);
                    doc.text(String(c.votes), 110, yPos + 5.5);
                    doc.text(`${percentage}%`, 140, yPos + 5.5);
                    
                    if (isWinner) {
                        doc.setTextColor(217, 119, 6); // amber-600 (Gold)
                        doc.text(`[Winner]`, 165, yPos + 5.5);
                    } else if (candidates.length === 1) {
                        doc.setTextColor(217, 119, 6);
                        doc.text(`[Winner]`, 165, yPos + 5.5);
                    }
                    
                    yPos += 8;
                });
            }
            
            yPos += 12; // Gap between position tables
        });
        
        doc.save(`election_results_${electionId}_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    if (loading && aggregatedResults.length === 0 && positions.length === 0) {
        return <div className="text-center p-12 text-gray-500 animate-pulse">Computing system results...</div>;
    }

    const isLive = electionStatus === 'RUNNING';
    const isStopped = electionStatus === 'STOPPED';

    return (
        <div className="space-y-6">
            {/* 1. Header & Controls */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Trophy className={isLive ? "text-green-500 animate-pulse" : "text-yellow-500"} />
                        {isLive ? "Live System Results" : isStopped ? "Final Election Results" : "Election Results"}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Last Updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>

                <div className="flex-center" style={{ gap: '0.75rem' }}>
                    <button onClick={handleDownloadPDF} className="btn btn-ghost" title="Download Results (PDF)">
                        <FileText size={20} />
                    </button>
                    <button onClick={handleDownloadCSV} className="btn btn-ghost" title="Download Results (CSV)">
                        <Download size={20} />
                    </button>
                    <button onClick={fetchData} className="btn btn-ghost" title="Refresh Now">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={handleResetResults} className="btn btn-ghost" style={{ color: 'var(--danger)' }} title="Clear All Data">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Public Link Config */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--neutral-100)', border: '1px dashed var(--neutral-300)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input 
                        type="checkbox" 
                        id="pubResultsToggle" 
                        checked={showResultsPublicly} 
                        onChange={handleTogglePublicResults}
                        style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                    />
                    <label htmlFor="pubResultsToggle" style={{ fontWeight: 600, cursor: 'pointer' }}>
                        Publish Results Publicly
                    </label>
                </div>
                {showResultsPublicly && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {`${window.location.origin}/#/results/${electionId}`}
                        </span>
                        <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/#/results/${electionId}`);
                                alert("Public results link copied to clipboard!");
                            }}
                        >
                            Copy Link
                        </button>
                    </div>
                )}
            </div>

            {/* 2. Navigation Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '0.5rem' }}>
                <button 
                    onClick={() => setActiveTab('position')}
                    className={`btn ${activeTab === 'position' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.5rem' }}
                >
                    <LayoutGrid size={18} /> By Position (Combined)
                </button>
                <button 
                    onClick={() => setActiveTab('booth')}
                    className={`btn ${activeTab === 'booth' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.5rem' }}
                >
                    <Monitor size={18} /> By Booth Breakdown
                </button>
            </div>

            {/* 3. Results Content */}
            {activeTab === 'position' ? (
                <div className="grid-cols-2">
                    {positions.map(pos => {
                        const candidates = (pos.candidates || []).map(c => {
                            const resCand = aggregatedResults.find(r => r.id === c.id);
                            return { ...c, votes: resCand ? resCand.votes : 0 };
                        });

                        const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

                        // Group candidates by votes
                        const grouped = candidates.reduce((acc, candidate) => {
                            if (!acc[candidate.votes]) {
                                acc[candidate.votes] = [];
                            }
                            acc[candidate.votes].push(candidate);
                            return acc;
                        }, {});

                        const groupedArray = Object.entries(grouped)
                            .map(([votes, list]) => ({
                                votes: Number(votes),
                                list,
                                names: list.map(c => c.name).join(", ")
                            }))
                            .sort((a, b) => b.votes - a.votes);

                        return (
                            <div key={pos.id} className="card">
                                <div className="section-header" style={{ borderBottomColor: 'var(--neutral-100)' }}>
                                    <h3 style={{ fontSize: '1.1rem' }}>{pos.title}</h3>
                                    <span className="badge badge-neutral">{totalVotes} Votes</span>
                                </div>
                                <div className="space-y-4" style={{ marginTop: '1rem' }}>
                                    {groupedArray.map((group, idx) => {
                                        const isUnopposed = candidates.length === 1;
                                        const percentage = isUnopposed ? 100 : (totalVotes > 0 ? ((group.votes / totalVotes) * 100).toFixed(1) : 0);
                                        const isWinner = (idx === 0 && group.votes > 0) || isUnopposed;
                                        return (
                                            <div key={group.votes}>
                                                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: isWinner ? 700 : 500 }}>
                                                        {isWinner && <Trophy size={14} style={{ color: '#fbbf24', display: 'inline', marginRight: '4px' }} />}
                                                        {group.names}
                                                    </span>
                                                    <span style={{ fontWeight: 600 }}>
                                                        {isUnopposed ? 'Declared Winner (Unopposed)' : `${group.votes} (${percentage}%)`}
                                                    </span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'var(--neutral-100)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ 
                                                        width: `${percentage}%`, 
                                                        height: '100%', 
                                                        background: isWinner ? 'var(--primary)' : 'var(--neutral-300)',
                                                        transition: 'width 0.5s ease-out'
                                                    }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {candidates.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No candidates</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-8">
                    {boothWiseResults.map(booth => (
                        <div key={booth.boothId} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                            <div className="section-header">
                                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{booth.boothName}</h3>
                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Station ID: {booth.boothId.split('-')[0]}</span>
                            </div>
                            <div className="grid-cols-2" style={{ marginTop: '1.5rem', gap: '1.5rem' }}>
                                {booth.positions.map(pos => {
                                    const totalBoothVotes = pos.candidates.reduce((sum, c) => sum + c.votes, 0);

                                    // Group candidates by votes
                                    const grouped = (pos.candidates || []).reduce((acc, candidate) => {
                                        if (!acc[candidate.votes]) {
                                            acc[candidate.votes] = [];
                                        }
                                        acc[candidate.votes].push(candidate);
                                        return acc;
                                    }, {});

                                    const groupedArray = Object.entries(grouped)
                                        .map(([votes, list]) => ({
                                            votes: Number(votes),
                                            names: list.map(c => c.name).join(", ")
                                        }))
                                        .sort((a, b) => b.votes - a.votes);

                                    return (
                                        <div key={pos.id} className="p-3 border rounded-lg bg-white shadow-sm">
                                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1px solid var(--neutral-100)', paddingBottom: '0.5rem' }}>
                                                {pos.title}
                                            </h4>
                                            <div className="space-y-2">
                                                {groupedArray.map(group => (
                                                    <div key={group.votes} className="flex-between text-sm">
                                                        <span style={{ color: 'var(--neutral-600)' }}>{group.names}</span>
                                                        <span style={{ fontWeight: 600 }}>{group.votes}</span>
                                                    </div>
                                                ))}
                                                {pos.candidates.length === 0 && <p className="text-xs italic text-gray-400">No votes recorded</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {booth.positions.length === 0 && <p className="text-center py-4 text-gray-500 w-full" style={{ gridColumn: 'span 2' }}>This booth has no assigned positions or no votes yet.</p>}
                            </div>
                        </div>
                    ))}
                    {boothWiseResults.length === 0 && <p className="text-center py-12 text-gray-500">No active booths found.</p>}
                </div>
            )}
        </div>
    );
};

export default ElectionResults;
