"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Play, Pause, X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type MediaItem = {
  _id: string;
  storageId: string;
  type: string;
  url: string | null;
};

type ProjectMediaCarouselProps = {
  media: MediaItem[];
  allowExpand?: boolean;
};

export function ProjectMediaCarousel({
  media,
  allowExpand = true,
}: ProjectMediaCarouselProps) {
  const isCompactPreview = !allowExpand;
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedApi, setExpandedApi] = useState<CarouselApi>();
  const [expandedCurrent, setExpandedCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!expandedApi) return;

    const onSelect = () => {
      setExpandedCurrent(expandedApi.selectedScrollSnap());
    };

    onSelect();
    expandedApi.on("select", onSelect);

    return () => {
      expandedApi.off("select", onSelect);
    };
  }, [expandedApi]);

  // Scroll expanded carousel to correct slide when opened
  useEffect(() => {
    if (isExpanded && expandedApi) {
      expandedApi.scrollTo(current, true);
    }
  }, [isExpanded, expandedApi, current]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    // Sync position back to main carousel
    if (api && expandedApi) {
      api.scrollTo(expandedApi.selectedScrollSnap(), true);
    }
    setIsExpanded(false);
  };

  if (media.length === 0) return null;

  return (
    <>
      <div
        className={`relative w-full ${isCompactPreview ? "max-w-xl" : "max-w-2xl mx-auto"}`}
      >
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {media.map((item) => (
              <CarouselItem key={item._id}>
                <MediaSlide
                  media={item}
                  onExpand={allowExpand ? handleExpand : undefined}
                  isSingleItem={media.length === 1}
                  isExpanded={isExpanded}
                  isCompactPreview={isCompactPreview}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {media.length > 1 && (
            <>
              <CarouselPrevious
                className="left-2 bg-black/30 hover:bg-black/40 text-white border-0"
                onClick={(e) => { e.stopPropagation(); api?.scrollPrev(); }}
              />
              <CarouselNext
                className="right-2 bg-black/30 hover:bg-black/40 text-white border-0"
                onClick={(e) => { e.stopPropagation(); api?.scrollNext(); }}
              />
            </>
          )}
        </Carousel>

        {/* Dot indicators - overlayed at bottom center */}
        {media.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 rounded-full px-2 py-1.5">
            {media.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === current ? "bg-white" : "bg-white/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  api?.scrollTo(index);
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Expanded Lightbox Dialog */}
      {allowExpand && (
        <Dialog open={isExpanded} onOpenChange={(open) => !open && handleClose()}>
          <DialogContent
            className="max-w-none sm:max-w-none w-[95vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none"
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">Media viewer</DialogTitle>
            {/* Custom close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center">
              <Carousel setApi={setExpandedApi} className="w-full max-w-[90vw]">
                <CarouselContent>
                  {media.map((item) => (
                    <CarouselItem key={item._id}>
                      <ExpandedMediaSlide media={item} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {media.length > 1 && (
                  <>
                    <CarouselPrevious className="left-4 bg-black/50 hover:bg-black/70 text-white border-0 w-12 h-12" />
                    <CarouselNext className="right-4 bg-black/50 hover:bg-black/70 text-white border-0 w-12 h-12" />
                  </>
                )}
              </Carousel>

              {/* Dot indicators for expanded view */}
              {media.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-full px-3 py-2">
                  {media.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        index === expandedCurrent ? "bg-white" : "bg-white/50"
                      }`}
                      onClick={() => expandedApi?.scrollTo(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function MediaSlide({
  media,
  onExpand,
  isSingleItem,
  isExpanded,
  isCompactPreview,
}: {
  media: MediaItem;
  onExpand?: () => void;
  isSingleItem: boolean;
  isExpanded: boolean;
  isCompactPreview: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Pause video when the expanded lightbox opens
  useEffect(() => {
    if (isExpanded && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isExpanded]);

  if (!media.url) return null;
  const isVideo = media.type === "video";
  const multiItemHeightClass = isCompactPreview ? "h-[240px]" : "h-[320px]";
  const singleItemMaxHeightClass = isCompactPreview ? "max-h-[240px]" : "max-h-[320px]";

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div
      className={`relative w-full rounded-lg overflow-hidden cursor-pointer ${isVideo ? "bg-black" : "bg-zinc-100"}`}
      onClick={onExpand}
    >
      {isVideo ? (
        <div
          className={`relative w-full ${isSingleItem ? "" : multiItemHeightClass} flex items-center justify-center`}
        >
          <video
            ref={videoRef}
            src={media.url}
            className={`w-full object-contain ${isSingleItem ? `h-auto ${singleItemMaxHeightClass}` : "max-h-full"}`}
            preload="metadata"
            playsInline
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${
              isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
            }`}
          >
            <button
              className="pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full bg-white/90 shadow-lg cursor-pointer"
              onClick={handleVideoClick}
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-zinc-900" fill="currentColor" />
              ) : (
                <Play
                  className="w-5 h-5 text-zinc-900 ml-0.5"
                  fill="currentColor"
                />
              )}
            </button>
          </div>
        </div>
      ) : isSingleItem ? (
        <img
          src={media.url}
          alt="Project media"
          className={`w-full h-auto object-contain ${singleItemMaxHeightClass}`}
        />
      ) : (
        <div className={`relative w-full overflow-hidden ${multiItemHeightClass}`}>
          {/* Blurred background for letterboxing */}
          <Image
            src={media.url}
            alt=""
            fill
            className="object-cover blur-2xl scale-125 opacity-60"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            unoptimized
          />
          {/* Main image */}
          <Image
            src={media.url}
            alt="Project media"
            fill
            className="object-contain relative z-10"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}

function ExpandedMediaSlide({ media }: { media: MediaItem }) {
  if (!media.url) return null;
  const isVideo = media.type === "video";

  return (
    <div className="relative w-full flex items-center justify-center max-h-[85vh]">
      {isVideo ? (
        <video
          src={media.url}
          controls
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
          autoPlay={false}
        />
      ) : (
        <div className="relative w-full h-[85vh]">
          <Image
            src={media.url}
            alt="Project media"
            fill
            className="object-contain"
            unoptimized
            sizes="95vw"
          />
        </div>
      )}
    </div>
  );
}
