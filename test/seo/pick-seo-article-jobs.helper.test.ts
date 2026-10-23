import { describe, expect, it } from "vitest";
import { SeoArticleJobStatus, SeoArticleJobType } from "@prisma/client";
import {
  findActiveSeoArticleJob,
  findLatestDoneSeoArticleJob,
} from "@/feature/backoffice/seo/seo-article/helper/pick-seo-article-jobs.helper";
import type { SeoArticleJobItem } from "@/feature/backoffice/seo/seo-article/server/find-seo-article-jobs.action";

/** สร้างแถวคิวแบบย่อ — เทสต์สนใจแค่ jobType / status / seoArticleId */
const buildJob = (job: Partial<SeoArticleJobItem> & { seoArticleJobId: number }): SeoArticleJobItem => ({
  jobType: SeoArticleJobType.WRITE_NOW,
  status: SeoArticleJobStatus.QUEUED,
  categoryName: null,
  topic: "หัวข้อทดสอบ",
  targetKeyword: null,
  resultJson: null,
  seoArticleId: null,
  errorMessage: null,
  requestedBy: "tester",
  createdAt: new Date("2026-07-24T00:00:00Z"),
  finishedAt: null,
  ...job,
});

describe("findActiveSeoArticleJob", () => {
  it("เจองานที่ยังไม่จบของบทความที่ระบุ", () => {
    const jobs = [
      buildJob({ seoArticleJobId: 1, jobType: SeoArticleJobType.GENERATE_IMAGES, seoArticleId: 10 }),
      buildJob({ seoArticleJobId: 2, jobType: SeoArticleJobType.GENERATE_IMAGES, seoArticleId: 20 }),
    ];

    const found = findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.GENERATE_IMAGES, seoArticleId: 20 });

    expect(found?.seoArticleJobId).toBe(2);
  });

  it("นับ RUNNING ว่ายังไม่จบ", () => {
    const jobs = [
      buildJob({
        seoArticleJobId: 1,
        jobType: SeoArticleJobType.TRANSLATE_EN,
        seoArticleId: 10,
        status: SeoArticleJobStatus.RUNNING,
      }),
    ];

    expect(findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.TRANSLATE_EN, seoArticleId: 10 })).toBeDefined();
  });

  it("ไม่นับงานที่จบแล้ว — ปุ่มต้องหยุดหมุน", () => {
    const jobs = [
      buildJob({
        seoArticleJobId: 1,
        jobType: SeoArticleJobType.GENERATE_IMAGES,
        seoArticleId: 10,
        status: SeoArticleJobStatus.DONE,
      }),
      buildJob({
        seoArticleJobId: 2,
        jobType: SeoArticleJobType.GENERATE_IMAGES,
        seoArticleId: 10,
        status: SeoArticleJobStatus.FAILED,
      }),
    ];

    expect(
      findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.GENERATE_IMAGES, seoArticleId: 10 })
    ).toBeUndefined();
  });

  it("ชนิดงานต่างกันไม่ปนกัน — งานแปลไม่ทำให้ปุ่ม gen รูปหมุน", () => {
    const jobs = [buildJob({ seoArticleJobId: 1, jobType: SeoArticleJobType.TRANSLATE_EN, seoArticleId: 10 })];

    expect(
      findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.GENERATE_IMAGES, seoArticleId: 10 })
    ).toBeUndefined();
  });

  it("ไม่ระบุบทความ = เอาเฉพาะงานที่ไม่ผูกบทความ (ปุ่มเขียนทันทีบนหน้า hub)", () => {
    const jobs = [
      buildJob({ seoArticleJobId: 1, jobType: SeoArticleJobType.WRITE_NOW, seoArticleId: 10 }),
      buildJob({ seoArticleJobId: 2, jobType: SeoArticleJobType.WRITE_NOW, seoArticleId: null }),
    ];

    expect(findActiveSeoArticleJob(jobs, { jobType: SeoArticleJobType.WRITE_NOW })?.seoArticleJobId).toBe(2);
  });

  it("คิวว่างคืน undefined", () => {
    expect(findActiveSeoArticleJob([], { jobType: SeoArticleJobType.WRITE_NOW })).toBeUndefined();
  });
});

describe("findLatestDoneSeoArticleJob", () => {
  it("คืนใบแรกที่เจอ = ใบล่าสุด (คิวเรียงใหม่→เก่ามาแล้ว)", () => {
    const jobs = [
      buildJob({
        seoArticleJobId: 9,
        jobType: SeoArticleJobType.SINGLE_IMAGE,
        seoArticleId: 10,
        status: SeoArticleJobStatus.DONE,
      }),
      buildJob({
        seoArticleJobId: 3,
        jobType: SeoArticleJobType.SINGLE_IMAGE,
        seoArticleId: 10,
        status: SeoArticleJobStatus.DONE,
      }),
    ];

    expect(
      findLatestDoneSeoArticleJob(jobs, { jobType: SeoArticleJobType.SINGLE_IMAGE, seoArticleId: 10 })?.seoArticleJobId
    ).toBe(9);
  });

  it("ข้ามงานที่พัง — งานพังไม่มีผลลัพธ์ให้เอาไปใช้", () => {
    const jobs = [
      buildJob({
        seoArticleJobId: 9,
        jobType: SeoArticleJobType.SINGLE_IMAGE,
        seoArticleId: 10,
        status: SeoArticleJobStatus.FAILED,
      }),
      buildJob({
        seoArticleJobId: 3,
        jobType: SeoArticleJobType.SINGLE_IMAGE,
        seoArticleId: 10,
        status: SeoArticleJobStatus.DONE,
      }),
    ];

    expect(
      findLatestDoneSeoArticleJob(jobs, { jobType: SeoArticleJobType.SINGLE_IMAGE, seoArticleId: 10 })?.seoArticleJobId
    ).toBe(3);
  });

  it("ไม่นับงานที่ยังทำอยู่", () => {
    const jobs = [buildJob({ seoArticleJobId: 1, jobType: SeoArticleJobType.SINGLE_IMAGE, seoArticleId: 10 })];

    expect(
      findLatestDoneSeoArticleJob(jobs, { jobType: SeoArticleJobType.SINGLE_IMAGE, seoArticleId: 10 })
    ).toBeUndefined();
  });
});
