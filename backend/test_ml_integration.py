"""
Test script to verify ML integration and grounded AI analysis
"""
import sys
import os
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    try:
        os.system('chcp 65001 > nul')
    except:
        pass

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from services.file_scanner import FileScanner
from services.prompt_builder import PromptBuilder
from services.analysis_service import AnalysisService


def test_ml_integration():
    """Test ML integration with a sample repository"""
    
    print("=" * 80)
    print("ML INTEGRATION TEST")
    print("=" * 80)
    
    # Test with a sample repository path
    test_repo_path = Path(__file__).parent / "temp_repos"
    
    # Find first available test repository
    test_repos = list(test_repo_path.glob("*"))
    if not test_repos:
        print("❌ No test repositories found in temp_repos/")
        print("   Clone a repository first to test ML integration")
        return False
    
    repo_path = test_repos[0]
    print(f"\n[REPO] Testing with repository: {repo_path.name}")
    print("-" * 80)
    
    # Step 1: Scan repository
    print("\n[STEP 1] Scanning repository...")
    scanner = FileScanner(str(repo_path))
    scan_result = scanner.scan()
    
    if not scan_result['success']:
        print(f"❌ Scan failed: {scan_result.get('error')}")
        return False
    
    print(f"[OK] Scanned {scan_result['file_count']} files")
    print(f"     Total lines: {scan_result['total_lines']:,}")
    print(f"     Technologies: {', '.join(scan_result.get('technologies', [])[:5])}")
    
    # Step 2: Get ML predictions
    print("\n[STEP 2] Getting ML predictions...")
    analysis_service = AnalysisService()
    ml_results = analysis_service.get_ml_scores(scan_result)
    
    if not ml_results:
        print("[WARNING] ML service not available - using heuristic scoring")
        print("   To enable ML: pip install -r requirements-ml.txt")
        print("   Then train models: python ml/model_trainer.py")
    else:
        print("[OK] ML predictions generated")
        
        # Display ML scores
        ml_scores = ml_results.get('ml_scores', {})
        print("\n     ML Scores:")
        print(f"     - Overall Quality:       {ml_scores.get('overall_quality', 0):.1f}/100")
        print(f"     - Maintainability:       {ml_scores.get('maintainability', 0):.1f}/100")
        print(f"     - Scalability:           {ml_scores.get('scalability', 0):.1f}/100")
        print(f"     - Architecture:          {ml_scores.get('architecture', 0):.1f}/100")
        print(f"     - Production Readiness:  {ml_scores.get('production_readiness', 0):.1f}/100")
        
        # Display confidence
        confidence = ml_results.get('confidence', 0)
        print(f"\n     Prediction Confidence: {confidence:.2%}")
        
        # Display feature contributions
        contributions = ml_results.get('feature_contributions', {})
        if contributions:
            print("\n     Top Contributing Features:")
            for feature in contributions.get('top_features', [])[:3]:
                print(f"     - {feature['name']}: {feature['contribution']:.1f}")
            
            positive = contributions.get('positive_factors', [])
            if positive:
                print("\n     Positive Factors:")
                for factor in positive[:3]:
                    print(f"     + {factor}")
            
            negative = contributions.get('negative_factors', [])
            if negative:
                print("\n     Negative Factors:")
                for factor in negative[:3]:
                    print(f"     - {factor}")
    
    # Step 3: Build prompt with ML results
    print("\n[STEP 3] Building AI prompt with ML context...")
    prompt_builder = PromptBuilder()
    prompt = prompt_builder.build_analysis_prompt(scan_result, ml_results)
    
    # Check if ML results are in prompt
    has_ml_context = "MACHINE LEARNING ANALYSIS RESULTS" in prompt
    if has_ml_context:
        print("[OK] ML results injected into AI prompt")
        print("     Prompt includes:")
        print("     - ML quality scores")
        print("     - Feature contributions")
        print("     - Prediction confidence")
        print("     - Grounding instructions for LLM")
    else:
        print("[WARNING] ML results not found in prompt")
        print("   AI analysis may not be grounded in ML predictions")
    
    # Step 4: Get AI analysis
    print("\n[STEP 4] Getting AI analysis...")
    ai_result = analysis_service.analyze(
        prompt,
        use_mock=True,  # Use mock for testing
        scan_result=scan_result
    )
    
    if ai_result['success']:
        print("[OK] AI analysis completed")
        
        # Check if ML scores are in result
        if 'ml_scores' in ai_result:
            print("[OK] ML scores included in AI result")
        else:
            print("[WARNING] ML scores not in AI result")
        
        # Check if feature contributions are in result
        if 'feature_contributions' in ai_result:
            print("[OK] Feature contributions included in AI result")
        else:
            print("[WARNING] Feature contributions not in AI result")
        
        # Display model used
        model_used = ai_result.get('ml_model_used', 'none')
        print(f"\n     Model Used: {model_used}")
    else:
        print(f"[ERROR] AI analysis failed: {ai_result.get('error')}")
        return False
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    checks = [
        ("Repository scanning", scan_result['success']),
        ("ML predictions", bool(ml_results)),
        ("ML context in prompt", has_ml_context),
        ("AI analysis", ai_result['success']),
        ("ML scores in result", 'ml_scores' in ai_result),
        ("Feature contributions", 'feature_contributions' in ai_result)
    ]
    
    passed = sum(1 for _, status in checks if status)
    total = len(checks)
    
    print(f"\nPassed: {passed}/{total} checks")
    print()
    
    for check_name, status in checks:
        icon = "[OK]" if status else "[FAIL]"
        print(f"{icon} {check_name}")
    
    print("\n" + "=" * 80)
    
    if passed == total:
        print("[SUCCESS] ALL TESTS PASSED - ML integration working correctly!")
        return True
    elif passed >= total - 2:
        print("[WARNING] MOSTLY WORKING - Some optional features missing")
        return True
    else:
        print("[FAILED] TESTS FAILED - ML integration needs attention")
        return False


if __name__ == "__main__":
    success = test_ml_integration()
    sys.exit(0 if success else 1)

# Made with Bob
