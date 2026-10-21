/**
 * Tier 1 Test Suite: 绘画创作 (Art Creation) Persona Feature Coverage
 * Covers: 7-stage pipeline state machine, visual progress %, canvas metadata, inspiration tags, hours audit.
 */

const { TodoAppDriver } = require('../harness/app_driver.cjs');
const { expect } = require('../harness/assertions.cjs');

describe('Tier 1: Art Persona - Feature Coverage', () => {
  let app;

  beforeEach(() => {
    app = new TodoAppDriver();
    app.resetAllData();
    app.setActivePersona('art');
  });

  it('T1-ART-01: should initialize art commission with 7-stage pipeline and metadata', () => {
    const artTask = app.addTask({
      personaId: 'art',
      title: '赛博朋克商业主视觉立绘插画',
      tags: ['#商业插画', '#赛博朋克', '#厚涂'],
      personaData: {
        pipelineMilestone: 'planning',
        milestonesCompleted: ['planning'],
        canvasWidth: 3840,
        canvasHeight: 2160,
        canvasUnit: 'px',
        dpi: 300,
        colorSpace: 'RGB',
        software: 'Clip Studio Paint',
        estimatedHours: 20.0,
        actualHours: 0.0,
        inspirationTags: ['霓虹夜景', '机械义肢', '雨夜反光']
      }
    });

    expect(artTask.id).toBeDefined();
    expect(artTask.personaData.pipelineMilestone).toBe('planning');
    expect(artTask.personaData.canvasWidth).toBe(3840);
    expect(artTask.personaData.dpi).toBe(300);
    expect(artTask.tags).toContain('#商业插画');
  });

  it('T1-ART-02: should advance through 7-stage pipeline and compute exact stage progress percentage', () => {
    const artTask = app.addTask({
      personaId: 'art',
      title: '二次元角色立绘约稿',
      personaData: {
        pipelineMilestone: 'planning',
        milestonesCompleted: ['planning'],
        estimatedHours: 10,
        actualHours: 0
      }
    });

    // Advance to draft (2/7 -> 29%)
    let progress = app.advanceArtStage(artTask.id, 'draft');
    expect(progress.count).toBe(2);
    expect(progress.percentage).toBe(29);

    // Advance to lineart (3/7 -> 43%)
    progress = app.advanceArtStage(artTask.id, 'lineart');
    expect(progress.count).toBe(3);
    expect(progress.percentage).toBe(43);

    // Advance to flat_color (4/7 -> 57%)
    progress = app.advanceArtStage(artTask.id, 'flat_color');
    expect(progress.count).toBe(4);
    expect(progress.percentage).toBe(57);

    // Advance to delivery (final)
    app.advanceArtStage(artTask.id, 'detail');
    app.advanceArtStage(artTask.id, 'post_process');
    progress = app.advanceArtStage(artTask.id, 'delivery');

    expect(progress.count).toBe(7);
    expect(progress.percentage).toBe(100);
    expect(progress.isDelivered).toBe(true);
  });

  it('T1-ART-03: should validate canvas dimensions, DPI presets, and color profiles', () => {
    const validSpecs = app.validateCanvasSpecs({
      width: 4096,
      height: 2304,
      unit: 'px',
      dpi: 350,
      colorSpace: 'CMYK',
      software: 'Photoshop 2024'
    });

    expect(validSpecs.width).toBe(4096);
    expect(validSpecs.height).toBe(2304);
    expect(validSpecs.dpi).toBe(350);
    expect(validSpecs.colorSpace).toBe('CMYK');
    expect(validSpecs.software).toBe('Photoshop 2024');
  });

  it('T1-ART-04: should maintain inspiration tag matrix and style categories', () => {
    const artTask = app.addTask({
      personaId: 'art',
      title: '国风水彩山水画创作',
      tags: ['#古风国潮', '#水彩风'],
      personaData: {
        pipelineMilestone: 'planning',
        inspirationTags: ['青绿山水', '宋代留白', '宣纸纹理']
      }
    });

    const saved = app.getTask(artTask.id);
    expect(saved.tags).toHaveLength(2);
    expect(saved.personaData.inspirationTags).toContain('青绿山水');
    expect(saved.personaData.inspirationTags).toContain('宋代留白');
  });

  it('T1-ART-05: should calculate estimated vs actual hours variance and show overtime warning badge', () => {
    // Under estimated: 12h actual vs 15h estimated
    const auditUnder = app.auditArtHours(15.0, 12.0);
    expect(auditUnder.delta).toBe(-3.0);
    expect(auditUnder.isOvertime).toBe(false);
    expect(auditUnder.badgeText).toContain('结余');

    // Over estimated: 18.5h actual vs 15.0h estimated
    const auditOver = app.auditArtHours(15.0, 18.5);
    expect(auditOver.delta).toBe(3.5);
    expect(auditOver.isOvertime).toBe(true);
    expect(auditOver.badgeText).toBe('+3.5h 超时');
  });

  it('T1-ART-06: should allow non-linear stage skipping without corrupting pipeline progress', () => {
    const artTask = app.addTask({
      personaId: 'art',
      title: '极速概念草图摸鱼',
      personaData: {
        pipelineMilestone: 'planning',
        milestonesCompleted: ['planning']
      }
    });

    // Skip directly from planning to detail
    const progress = app.advanceArtStage(artTask.id, 'detail');
    expect(progress.count).toBe(2); // planning + detail completed
    expect(progress.percentage).toBe(29);

    const task = app.getTask(artTask.id);
    expect(task.personaData.pipelineMilestone).toBe('detail');
    expect(task.personaData.milestonesCompleted).toContain('planning');
    expect(task.personaData.milestonesCompleted).toContain('detail');
  });
});
